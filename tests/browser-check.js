async (page) => {
  const context = page.context()
  for (const other of context.pages()) if (other !== page) await other.close()
  const extensionId = await context.serviceWorkers()[0].evaluate(() => chrome.runtime.id)
  const base = `chrome-extension://${extensionId}/`
  const results = []
  const check = (name, condition) => { results.push({name,pass:!!condition}); if(!condition) throw new Error('FAIL: '+name) }
  const dialogs=[]
  page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss()})
  await page.goto(base+'popup.html')
  const send = async message => {
    const r=await page.evaluate(m=>chrome.runtime.sendMessage(m),message)
    if(!r?.ok) throw new Error(r?.error || 'No response')
    return r.data
  }
  const initial = await send({message:'get ui state'})
  for (const country of ['au','nz']) for (const profile of Object.values(initial[country])) {
    if ([profile.account,profile.password,profile.Passport,profile.GivenName,profile.FamilyName,profile.email].some(Boolean) && !profile.account.startsWith('TEST-')) throw new Error('Refusing to overwrite non-test profiles')
  }
  await send({message:'patch settings',patch:{country:'nz',mode:'fill','teaching-mode':'0','auto-jump':'0','info-group':'0'}})
  await send({message:'patch profile',country:'nz',group:'0',patch:{account:'TEST-USER-0',password:'TEST-PASSWORD-0'}})
  await send({message:'patch profile',country:'nz',group:'1',patch:{account:'TEST-USER-1',password:'TEST-PASSWORD-1'}})
  const worker=context.serviceWorkers()[0]
  const html='<html><body>Check My Applications<input name="username"><input name="password"><input type="button" value="LOGIN" onclick="document.body.dataset.clicks=String(Number(document.body.dataset.clicks||0)+1)"></body></html>'
  const bad=await context.newPage()
  await bad.route('https://review-fixture.invalid/**',r=>r.fulfill({contentType:'text/html',body:html}))
  await bad.goto('https://review-fixture.invalid/?next=onlineservices.immigration.govt.nz')
  await bad.waitForTimeout(350)
  check('spoofed domain receives no credentials',await bad.locator('[name=username]').inputValue()==='')
  const good=await context.newPage()
  const cdp=await context.newCDPSession(good)
  const worlds=[]
  cdp.on('Runtime.executionContextCreated',e=>worlds.push(e.context))
  await cdp.send('Runtime.enable')
  await good.route('https://onlineservices.immigration.govt.nz/**',r=>r.fulfill({contentType:'text/html',body:html}))
  await good.goto('https://onlineservices.immigration.govt.nz/')
  await good.waitForTimeout(500)
  check('NZ login fills selected profile',await good.locator('[name=username]').inputValue()==='TEST-USER-0')
  check('fill mode does not click',await good.locator('body').getAttribute('data-clicks')===null)
  const world=worlds.find(w=>w.name==='打工度假自动填表插件-大X-纽澳多用版')
  if(!world) throw new Error('Missing content-script world: '+JSON.stringify(worlds.map(w=>({name:w.name,auxData:w.auxData}))))
  const denied=await cdp.send('Runtime.evaluate',{contextId:world.id,expression:'chrome.runtime.sendMessage({message:"get ui state"})',awaitPromise:true,returnByValue:true})
  check('content cannot request all profiles',denied.result.value?.ok===false)
  const noProfiles=await cdp.send('Runtime.evaluate',{contextId:world.id,expression:'chrome.storage.local.get(["au","nz"]).then(x=>!x.au&&!x.nz).catch(()=>true)',awaitPromise:true,returnByValue:true})
  check('content storage has no legacy credentials',noProfiles.result.value===true)
  const shortcut=async()=>worker.evaluate(async()=>{const t=(await chrome.tabs.query({})).find(t=>t.url==='https://onlineservices.immigration.govt.nz/');await chrome.tabs.sendMessage(t.id,{message:'page action clicked'},{frameId:0})})
  await send({message:'patch settings',patch:{mode:'off'}})
  await good.locator('[name=username]').fill('')
  await good.locator('[name=password]').fill('')
  await shortcut()
  await good.waitForTimeout(250)
  check('off mode blocks shortcut fill and submit',await good.locator('[name=username]').inputValue()==='' && await good.locator('body').getAttribute('data-clicks')===null)
  await send({message:'patch settings',patch:{mode:'fill','info-group':'1'}})
  await shortcut()
  await good.waitForTimeout(250)
  check('shortcut reads current group',await good.locator('[name=username]').inputValue()==='TEST-USER-1')
  check('shortcut submits once in fill mode',await good.locator('body').getAttribute('data-clicks')==='1')
  await Promise.all([send({message:'patch settings',patch:{mode:'fill'}}),send({message:'patch settings',patch:{'teaching-mode':'1'}}),send({message:'patch profile',country:'nz',group:'1',patch:{GivenName:'ALICE'}}),send({message:'patch profile',country:'nz',group:'1',patch:{FamilyName:'EXAMPLE'}})])
  const state=await send({message:'get ui state'})
  check('concurrent writes preserve independent values',state.setting.mode==='fill'&&state.setting['teaching-mode']==='1'&&state.nz['1'].GivenName==='ALICE'&&state.nz['1'].FamilyName==='EXAMPLE')
  for(const name of ['popup','info_au','info_nz','link_au','link_nz']) {
    const ui=await context.newPage()
    ui.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss()})
    await ui.setViewportSize({width:375,height:800})
    await ui.goto(base+name+'.html')
    await ui.waitForTimeout(250)
    check(name+' UI has no JavaScript errors',(await ui.pageErrors()).length===0)
    check(name+' has one jQuery instance',await ui.locator('script[src*="jquery"]').count()===1)
    await ui.screenshot({path:'output/playwright/'+name+'.png',fullPage:true})
    if(name==='info_nz') {
      await ui.locator('#GivenName').fill('BOB')
      await ui.waitForTimeout(250)
      check('profile editor persists typed changes',(await send({message:'get ui state'})).nz['1'].GivenName==='BOB')
      await ui.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=>'{"password":42}',writeText:async()=>{}}}))
      await ui.locator('#hidden-import-info').click()
      await ui.waitForTimeout(200)
      check('invalid clipboard import leaves profile unchanged',(await send({message:'get ui state'})).nz['1'].password==='TEST-PASSWORD-1')
    }
    await ui.close()
  }
  check('only expected validation dialog',dialogs.length===1&&dialogs[0].includes('错误类型'))
  await good.close();await bad.close()
  return results
}
