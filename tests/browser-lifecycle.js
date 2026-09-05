async (page) => {
  const context=page.context(), results=[]
  const extensionId = await context.serviceWorkers()[0].evaluate(() => chrome.runtime.id)
  const base = `chrome-extension://${extensionId}/`
  const check=(name,pass)=>{results.push({name,pass:!!pass});if(!pass)throw new Error('FAIL '+name)}
  const send=async m=>{const r=await page.evaluate(m=>chrome.runtime.sendMessage(m),m);if(!r?.ok)throw new Error(r?.error||'No response');return r.data}
  await page.goto(base+'popup.html')
  const state=await send({message:'get ui state'})
  for (const country of ['au','nz']) for (const profile of Object.values(state[country])) {
    if ([profile.account,profile.password,profile.Passport,profile.GivenName,profile.FamilyName,profile.email].some(Boolean) && !profile.account.startsWith('TEST-')) throw new Error('Refusing to reset non-test profiles')
  }
  const cdp=await context.newCDPSession(page)
  let versions=[]
  cdp.on('ServiceWorker.workerVersionUpdated',e=>{versions=e.versions})
  await cdp.send('ServiceWorker.enable')
  await page.waitForTimeout(150)
  const stop=async()=>{const v=versions.find(v=>v.scriptURL.includes(extensionId));if(!v)throw new Error('No worker');await cdp.send('ServiceWorker.stopWorker',{versionId:v.versionId});await page.waitForTimeout(100)}
  await page.evaluate(async()=>{
    await new Promise((resolve,reject)=>{const r=indexedDB.open('great-x-private',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('values','readwrite');for(const key of ['migrated','setting','au','nz'])tx.objectStore('values').delete(key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}})
    await chrome.storage.local.set({setting:{mode:'fill','info-group':'3'},au:{3:{account:'TEST-LEGACY',password:'TEST-LEGACY-PASS'}}})
  })
  await stop()
  const migrated=await send({message:'get ui state'})
  check('cold-start migration preserves partial legacy profiles',migrated.au['3'].account==='TEST-LEGACY'&&migrated.au['3'].password==='TEST-LEGACY-PASS'&&migrated.setting['info-group']==='3'&&migrated.nz['0'].personalIDStart==='')
  check('legacy profile copies removed after migration',await page.evaluate(async()=>{const x=await chrome.storage.local.get(['au','nz']);return !x.au&&!x.nz}))
  await send({message:'patch settings',patch:{country:'au',mode:'off','test-mode':'1','auto-jump':'1','auto-refresh-interval':'30000'}})
  await send({message:'patch settings',patch:{'jump-url':'https://online.vfsglobal.com/retry'}})
  const before=await page.evaluate(()=>chrome.alarms.get('great-x-auto-refresh'))
  await stop()
  await send({message:'get ui state'})
  const after=await page.evaluate(()=>chrome.alarms.get('great-x-auto-refresh'))
  check('cold start preserves existing alarm schedule',before.scheduledTime===after.scheduledTime&&after.periodInMinutes===0.5)
  const unrelated=await context.newPage()
  await unrelated.route('https://review-fixture.invalid/**',r=>r.fulfill({contentType:'text/html',body:'<html><body>No favicon</body></html>'}))
  await unrelated.goto('https://review-fixture.invalid/no-favicon')
  const failed=await context.newPage()
  await failed.route('https://online.vfsglobal.com/**',r=>r.request().url().endsWith('/failed')?r.abort('connectionfailed'):r.fulfill({contentType:'text/html',body:'<html><body>Retry destination</body></html>'}))
  await failed.goto('https://online.vfsglobal.com/failed').catch(()=>{})
  await page.waitForTimeout(300)
  const tracked=await page.evaluate(async()=>Object.values((await chrome.storage.session.get('retryTabs')).retryTabs||{}))
  check('only actual allowed navigation failure is tracked',tracked.includes('https://online.vfsglobal.com/failed')&&!tracked.some(x=>x.includes('review-fixture')))
  await page.evaluate(()=>chrome.alarms.create('great-x-auto-refresh',{when:Date.now()+500}))
  await page.waitForTimeout(1500)
  check('alarm retries failed allowed tab',failed.url()==='https://online.vfsglobal.com/retry')
  check('alarm never redirects unrelated no-favicon tab',unrelated.url()==='https://review-fixture.invalid/no-favicon')
  await failed.close();await unrelated.close()
  await send({message:'patch settings',patch:{mode:'auto','test-mode':'0','auto-jump':'0'}})
  const poll=await context.newPage()
  await poll.route('https://online.vfsglobal.com/**',r=>r.fulfill({contentType:'text/html',body:'<html><body><select id="VisaApplicationCenterddl"><option value="">Choose</option></select><select id="VisaTypeddl"><option value="">Choose</option></select><select id="SubVisaCategoryOptions"><option value="">Choose</option></select><button id="btnApplicationDetailContinue" onclick="document.body.dataset.clicked=1">Continue</button></body></html>'}))
  await poll.goto('https://online.vfsglobal.com/application-detail')
  await poll.waitForTimeout(250)
  await send({message:'patch settings',patch:{mode:'off'}})
  await poll.evaluate(()=>{for(const [id,value] of [['VisaApplicationCenterddl','AUS-BEIJ'],['VisaTypeddl','Short'],['SubVisaCategoryOptions','WHV']]){const o=document.createElement('option');o.value=value;o.textContent=value;document.getElementById(id).append(o)}})
  await poll.waitForTimeout(350)
  check('off cancels pending asynchronous dropdown task',await poll.locator('body').getAttribute('data-clicked')===null&&await poll.locator('#VisaApplicationCenterddl').inputValue()==='')
  await send({message:'patch settings',patch:{mode:'auto'}})
  await poll.reload()
  await poll.waitForTimeout(15500)
  check('dropdown wait terminates with timeout notice',(await poll.locator('body').innerText()).includes('等待表单超时'))
  await poll.close()
  await send({message:'patch settings',patch:{mode:'off'}})
  return results
}
