/**
 * Readable compatibility adapter for the original AU/NZ form selectors.
 * Storage, origin authorization, navigation and scheduling are supplied by the typed controller.
 * @param {import('../shared/model').Context} context
 * @param {import('./types').EngineCapabilities} capabilities
 */
export function runEngine(context, capabilities) {
const {poll, clearPoll, notify, setTitle, navigate, reload, updateForm} = capabilities;
let noticeDuration = 10000;
const pushNotification = (type, html) => notify(type, html, noticeDuration);
const NZInputDate = (value, selector) => {
 if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
 const date = new Date(value+'T00:00:00Z');
 if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==value) return;
 const input = document.querySelector(selector);
 if (input) { input.value = date.getUTCDate()+' '+['January','February','March','April','May','June','July','August','September','October','November','December'][date.getUTCMonth()]+', '+date.getUTCFullYear(); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); }
};
const NZselectOption = (value, selector, label) => {
 const select = document.querySelector(selector);
 if (!select || !Array.from(select.options).some(option=>option.value===value)) return;
 select.value = value;
 const text=select.parentElement?.querySelector("span[id*='select2-chosen']");
 if (text) text.textContent=label || select.selectedOptions[0]?.textContent || '';
 select.parentElement?.querySelector('.select2-choice')?.classList.remove('select2-default');
 select.dispatchEvent(new Event('change',{bubbles:true}));
};
function runScript(request) {
  const cachedInfo = {
    setting: {
      ...context.setting
    }
  };
  if (cachedInfo.setting.mode === "off") return;
  let shouldSubmit = cachedInfo.setting.mode === "auto",
    teaching = cachedInfo.setting["teaching-mode"] === "1";
  false;
  let group = cachedInfo.setting["info-group"],
    profile = context.profile;
  request.sender === "pageAction" && (false, cachedInfo.setting.mode = "auto", shouldSubmit = !![]);
  try {
    let recognized = !![],
      captchaRequired = ![],
      pageURL = location.href,
      pageHTML = document.documentElement.innerHTML;
    if (cachedInfo.setting.country === "au") {
      if (pageURL.toLowerCase().includes("vfsglobal.cn/australia/china/schedule_an_appointment".toLowerCase()) && pageHTML.includes("http://www.weibo.com/imagineaustralia")) {
        teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/7679#%E8%BF%9B%E5%85%A5%E9%A2%84%E7%BA%A6%E7%B3%BB%E7%BB%9F' target=\"_blank\"> 点此查看如何进入预约系统 </a>");
        return;
      } else if (pageURL.toLowerCase().includes("register".toLowerCase()) && pageHTML.includes("lblEmailId") && pageHTML.includes("for=\"ConfirmPassword\" id=\"lblConfirmPassword\"") && document.querySelector("input[id='btnRegister']")) {
        document.querySelector("input[id='Email']").value = profile.account;
        document.querySelector("input[id='Password']").value = profile.password;
        document.querySelector("input[id='ConfirmPassword']").value = profile.password;
        document.querySelector("input[id='btnRegister']").classList.toString().includes("btn-disabled") && document.querySelector("span[class='checkmark']").click();
        shouldSubmit && document.querySelector("input[id='btnRegister']").click();
        pushNotification("error", "<b>大X: </b> 请注意，您目前位于澳洲新版预约系统，如果官方没有最新说明，一般WHV预约不在这套系统进行，请自行确认。");
      } else if (pageURL.toLowerCase().includes("login".toLowerCase()) && pageHTML.includes("lblEmailId") && pageHTML.includes("class=\"control-label\" for=\"Password\"") && pageHTML.includes("forgot-password") && document.querySelector("input[id='btnLogin']")) {
        document.querySelector("input[id='Email']").value = profile.account;
        document.querySelector("input[id='Password']").value = profile.password;
        shouldSubmit && document.querySelector("input[id='btnLogin']").click();
        pushNotification("error", "<b>大X: </b> 请注意，您目前位于澳洲新版预约系统，如果官方没有最新说明，一般WHV预约不在这套系统进行，请自行确认。");
      } else if (pageURL.toLowerCase().includes("dashboard".toLowerCase()) && pageHTML.includes("You don't have any appointments booked") && document.querySelector("a[href*='application-detail']")) {
        if (shouldSubmit) document.querySelector("a[href*='application-detail']").click();else {
          {
            pushNotification("warning", "<b>大X: </b> 没有需要填写的内容，请点击\"立即预约\"按钮开始预约");
            setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
          }
          return;
        }
      } else if (pageURL.toLowerCase().includes("application-detail".toLowerCase()) && pageHTML.includes("VisaApplicationCenterddl") && document.querySelector("select[id='VisaTypeddl']") && document.querySelector("select[id='SubVisaCategoryOptions']")) {
        pushNotification("warning", "<b>大X: </b> 正在尝试填写");
        let value1 = poll(() => {
          if (document.querySelector("#VisaApplicationCenterddl").options.length > 1) {
            clearPoll(value1);
            let value2 = {
                "1": "AUS-BEIJ",
                "2": "AUS-SHAN",
                "3": "AUS-GGZH",
                "4": "AUS-CHGD"
              },
              value3 = "";
            profile.city === "0" ? value3 = value2[Math.floor(Math.random() * 4) + 1 + ""] : value3 = value2[profile.city];
            document.querySelector("#VisaTypeddl").options.length < 2 && (document.querySelector("#VisaApplicationCenterddl").value = value3, document.querySelector("#VisaApplicationCenterddl").dispatchEvent(new Event("change")));
            let value4 = poll(() => {
              if (document.querySelector("#VisaTypeddl").options.length > 1) {
                clearPoll(value4);
                document.querySelector("#SubVisaCategoryOptions").options.length < 2 && (document.querySelector("#VisaTypeddl").value = "Short", document.querySelector("#VisaTypeddl").dispatchEvent(new Event("change")));
                let value5 = poll(() => {
                  if (document.querySelector("#SubVisaCategoryOptions").options.length > 1) {
                    clearPoll(value5);
                    let value6 = {
                      "0": "WHV",
                      "1": "General"
                    };
                    {
                      document.querySelector("#SubVisaCategoryOptions").value = value6[profile.type];
                      document.querySelector("#SubVisaCategoryOptions").dispatchEvent(new Event("change"));
                      pushNotification("success", "<b>大X: </b> 填写完毕");
                      shouldSubmit && document.querySelector("button[id='btnApplicationDetailContinue']").click();
                    }
                  }
                }, 50);
              }
            }, 50);
          }
        }, 50);
        return;
      } else if (pageURL.toLowerCase().includes("your-details".toLowerCase()) && pageHTML.includes("aria-labelledby=\"lblpassnum\" aria-required") && document.querySelector("input[id*='forename']") && document.querySelector("#applicant1").classList.toString().includes("in")) {
        {
          document.querySelector("input[id='forename_']").value = profile.GivenName;
          document.querySelector("input[id='lastName_']").value = profile.FamilyName;
        }
        let value7 = {
          "M": "Male",
          "F": "Female"
        };
        {
          document.querySelector("select[id*='gender_']").value = value7[profile.Gender];
          document.querySelector("input[id='dob_']").value = profile.birth.split("-").reverse().join("/");
          document.querySelector("select[id*='nationality_']").value = profile.nation;
          document.querySelector("input[id='passnum_']").value = profile.Passport;
          document.querySelector("input[id='pexpirydate_']").value = profile.expire.split("-").reverse().join("/");
          document.querySelector("input[id='countryCode_']").value = profile.area;
          document.querySelector("input[id='phoneNumber_']").value = profile.phone;
          document.querySelector("input[id='Email_']").value = profile.email;
          shouldSubmit && document.querySelector("input[id='btnSave']").click();
          shouldSubmit && document.querySelector("input[id*='btnContinue']").click();
        }
      } else if (pageURL.toLowerCase().includes("your-details".toLowerCase()) && pageHTML.includes("visual-icons remove-icon delete-icon-services accordion-icon-switch") && document.querySelector("button[id*='btnAddApplicant']") && !document.querySelector("#applicant1").classList.toString().includes("in")) {
        if (shouldSubmit) document.querySelector("input[id*='btnContinue']").click();else {
          {
            document.querySelector("#applicant1").classList.toString().includes("");
            pushNotification("warning", "<b>大X: </b> 没有需要填写的内容，请点击\"继续\"按钮");
            setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
          }
          return;
        }
      } else if (pageURL.toLowerCase().includes("book-appointment".toLowerCase())) {
        pushNotification("error", "<b>大X: </b> 本页及后续页面暂未适配自动填写");
        return;
      } else if (pageURL.toLowerCase().includes("".toLowerCase()) && pageHTML.includes("ctl00_plhMain_lnkSchApp") && pageHTML.includes("china.embassy.gov.au") && document.querySelector("a[id*='ctl00_plhMain_lnkSchApp']")) {
        teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/7679#%E9%A2%84%E7%BA%A6' target=\"_blank\"> 点此查看此页步骤 </a>");
        if (shouldSubmit) document.querySelector("a[id*=\"ctl00_plhMain_lnkSchApp\"]").click();else {
          {
            pushNotification("warning", "<b>大X: </b> 没有需要填写的内容，请点击\"预约\"按钮开始预约");
            setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
          }
          return;
        }
      } else if (pageURL.toLowerCase().includes("".toLowerCase()) && pageHTML.includes("ctl00_plhMain_lblScheduleAppt") && pageHTML.includes("ctl00_plhMain_lblVACLocation") && document.querySelector("input[class*='submitbttn']")) {
        teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/7679#%E9%80%89%E6%8B%A9%E5%9F%8E%E5%B8%82' target=\"_blank\"> 点此查看此页教程 </a>");
        let value8 = {
            "1": "Beijing",
            "2": "Shanghai",
            "3": "Guangzhou",
            "4": "Chengdu"
          },
          value9 = "";
        profile.city === "0" ? value9 = value8[Math.floor(Math.random() * 4) + 1 + ""] : value9 = value8[profile.city];
        let value10 = Array.from(document.querySelector('#ctl00_plhMain_cboVAC').options).find(option => option.textContent.includes(value9))?.value || '';
        document.querySelector("#ctl00_plhMain_cboVAC").value = value10;
        if (document.querySelector("input[name*='ptcha']") || document.querySelector("input[id*='ptcha']")) {
          {
            pushNotification("warning", "<b>大X: </b> 本页需要手动填写验证码");
            setTitle(" 本页需要手动填写验证码");
          }
          return;
        } else shouldSubmit && document.querySelector("input[class='submitbttn']").click();
      } else if (pageURL.toLowerCase().includes("".toLowerCase()) && pageHTML.includes("ctl00_plhMain_cboVisaCategory") && pageHTML.includes("ctl00_plhMain_tbxNumOfApplicants") && document.querySelector("input[type*='ubmit']")) {
        teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/7679#%E9%80%89%E6%8B%A9%E7%AD%BE%E8%AF%81%E7%B1%BB%E5%9E%8B' target=\"_blank\"> 点此查看此页填写教程 </a>");
        let value11 = {
          "0": "13",
          "1": "17"
        };
        document.querySelector("select[id*=\"ctl00_plhMain_cboVisaCategory\"]").value = value11[profile.type];
        if (document.querySelector("input[name*='ptcha']") || document.querySelector("input[id*='ptcha']")) {
          {
            pushNotification("warning", "<b>大X: </b> 本页需要手动填写验证码");
            setTitle(" 本页需要手动填写验证码");
          }
          return;
        } else shouldSubmit && document.querySelector("input[type*='ubmit']").click();
      } else if ((pageHTML.includes("ctl00_plhMain_txtEmailID") || pageHTML.includes("ctl00_plhMain_txtPassword")) && pageHTML.includes("ctl00_plhMain_ImageButton") && !pageHTML.includes("ctl00_plhMain_txtb") && !pageURL.toLowerCase().includes("judge.html".toLowerCase())) {
        teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/7679#%E5%A1%AB%E5%86%99%E9%82%AE%E7%AE%B1' target=\"_blank\"> 点此查看此页填写教程 </a>");
        try {
          document.querySelector("input[id*=\"ctl00_plhMain_txtEmail\"]").value = profile.email;
        } catch (value12) {
          false;
        }
        try {
          document.querySelector("input[id*=\"ctl00_plhMain_txtPassword\"]").value = profile.password;
        } catch (value13) {
          false;
        }
        try {
          document.querySelector("input[id*=\"ctl00_plhMain_txtCnfPassword\"]").value = profile.password;
        } catch (value14) {
          false;
        }
        try {
          document.querySelector("input[name*=\"ctl00$plhMain$txtCnfPassword1\"]").value = profile.password;
        } catch (value15) {
          false;
        }
        try {
          document.querySelector("input[name*=\"ctl00$plhMain$txtEmail\"]").value = profile.email;
        } catch (value16) {
          false;
        }
        try {
          document.querySelector("input[type*=\"password\"]").value = profile.password;
        } catch (value17) {
          false;
        }
        if (document.querySelector("input[name*='ptcha']") || document.querySelector("input[id*='ptcha']")) {
          {
            pushNotification("warning", "<b>大X: </b> 本页需要手动填写验证码");
            setTitle(" 本页需要手动填写验证码");
          }
          return;
        } else shouldSubmit && document.querySelector("input[type*='ubmit']").click();
      } else if (pageURL.toLowerCase().includes("detail".toLowerCase()) && pageHTML.includes("澳洲打工度假名额预约模拟系统") || pageHTML.includes("ctl00_plhMain_repAppVisaDetails_ctl01_tbxPassportNo") && pageHTML.includes("ctl00_plhMain_repAppVisaDetails_ctl01_tbxFName") && pageHTML.includes("ctl00_plhMain_repAppVisaDetails_ctl01_tbxLName")) {
        teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/7679#%E5%A1%AB%E5%86%99%E4%B8%AA%E4%BA%BA%E4%BF%A1%E6%81%AF' target=\"_blank\"> 点此查看此页填写教程 </a>");
        let value18 = {
          "F": "MS.",
          "M": "MR."
        };
        {
          document.querySelector("input[id*=\"ctl00_plhMain_repAppVisaDetails_ctl01_tbxPassportNo\"]").value = profile.Passport;
          document.querySelector("select[id*=\"ctl00_plhMain_repAppVisaDetails_ctl01_cboTitle\"]").value = value18[profile.Gender];
          document.querySelector("input[id*=\"ctl00_plhMain_repAppVisaDetails_ctl01_tbxFName\"]").value = profile.FamilyName;
          document.querySelector("input[id*=\"ctl00_plhMain_repAppVisaDetails_ctl01_tbxLName\"]").value = profile.GivenName;
          document.querySelector("input[id*=\"ctl00_plhMain_repAppVisaDetails_ctl01_tbxSTDCode\"]").value = profile.area;
          document.querySelector("input[id*=\"ctl00_plhMain_repAppVisaDetails_ctl01_tbxContactNumber\"]").value = profile.phone;
          document.querySelector("input[id*=\"ctl00_plhMain_repAppVisaDetails_ctl01_tbxMobileNumber\"]").value = profile.mobile;
          document.querySelector("input[id*=\"ctl00_plhMain_repAppVisaDetails_ctl01_tbxEmailAddress\"]").value = profile.email;
        }
        if (document.querySelector("input[name*='ptcha']") || document.querySelector("input[id*='ptcha']")) {
          {
            pushNotification("warning", "<b>大X: </b> 本页需要手动填写验证码");
            setTitle(" 本页需要手动填写验证码");
          }
          return;
        } else shouldSubmit && document.querySelector("input[type*='ubmit']").click();
      } else if (pageHTML.includes("ctl00_plhMain_cldAppointment") || pageHTML.includes("ctl00_plhMain_gvSlot")) {
        {
          teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/7679#%E9%80%89%E6%8B%A9%E6%97%A5%E6%9C%9F' target=\"_blank\"> 点此查看此页步骤 </a>");
          pushNotification("warning", "<b>大X: </b> 请手动选择日期/时间");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      } else if (pageHTML.includes("ctl00_plhMain_txtb") || pageURL.toLowerCase().includes("judge".toLowerCase()) && pageHTML.includes("澳洲打工度假名额预约模拟系统")) {
        {
          teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/7679#%E5%A1%AB%E5%86%99%E9%82%AE%E4%BB%B6pdf%E9%87%8C%E5%8F%91%E6%9D%A5%E7%9A%84%E9%AA%8C%E8%AF%81%E7%A0%81' target=\"_blank\"> 点此查看此页步骤 </a>");
          pushNotification("warning", "<b>大X: </b> 请从邮件中获取验证码，并填写入表格");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      } else if (pageHTML.includes("lblReference")) {
        {
          noticeDuration = 10000000;
          pushNotification("success", "<b>大X: </b> 恭喜你已经成功抢到澳洲WHV名额，<b><a href='https://iwhver.com/7705' target=\"_blank\"> 点此查看材料准备攻略 </a></b>");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      } else recognized = ![];
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz".toLowerCase()) && pageHTML.includes("Check My Applications") && document.querySelector("input[name='password']")) {
      teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/28150' target=\"_blank\"> 点此查看抢名额图文攻略 </a>");
      document.querySelector("input[name='username']").value = profile.account;
      document.querySelector("input[name='password']").value = profile.password;
      shouldSubmit && document.querySelector("input[value='LOGIN']").click();
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz/Registration".toLowerCase()) && pageHTML.includes("It's important that you remember your User name and Password") && document.querySelector("input[name*='password']")) {
      {
        document.querySelector("input[name*='firstNameTextBox']").value = profile.GivenName;
        document.querySelector("input[name*='familyNameTextBox']").value = profile.FamilyName;
        document.querySelector("input[name*='emailAddressTextBox']").value = profile.email;
        document.querySelector("input[name*='userNameTextBox']").value = profile.account;
        document.querySelector("input[name*='passwordTextBox']").value = profile.password;
        document.querySelector("input[name*='passwordConfirmTextBox']").value = profile.password;
        document.querySelector("#agreeToConditionsCheckBox").checked = !![];
        pushNotification("warning", "<b>大X: </b> 请补充该页面必要信息");
        setTitle("此页面可被大X插件操作，点击按钮将再次执行操作");
      }
      return;
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz/Registration".toLowerCase()) && pageHTML.includes("Thank you for registering with this website") && pageHTML.includes("We have sent a message to your email address confirming your registration")) {
      if (shouldSubmit) navigate("https://onlineservices.immigration.govt.nz");else {
        {
          pushNotification("warning", "<b>大X: </b> 没有需要填写的内容，请前往<b><a href='https://onlineservices.immigration.govt.nz' target=\"_blank\"> 登录页 </a></b>开始申请");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      }
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz".toLowerCase()) && pageHTML.includes("You can apply for and review your application for one of the following") && pageHTML.includes("\"/WorkingHoliday/\">Click here to apply</a>")) {
      teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/28150#%E9%80%89%E5%8F%96%E5%9B%BD%E5%AE%B6' target=\"_blank\"> 点此查看如何获取表格 </a>");
      if (shouldSubmit) document.querySelector("a[href*='WorkingHoliday']").click();else {
        {
          pushNotification("warning", "<b>大X: </b> 没有需要填写的内容，请点击WHV下的\"Click here to apply\"开始申请");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      }
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz".toLowerCase()) && pageHTML.includes("You can check the status and details of your existing") && pageHTML.includes("Payment Status")) {
      teaching && !shouldSubmit && pushNotification("info", "<b>大X:</b><a href='https://iwhver.com/28150#%E8%A1%A8%E6%A0%BC' target=\"_blank\"> 点此查看如何填写表格 </a>");
      let value19 = document.querySelector("a[href*='WorkingHoliday/application/edit.aspx?ApplicationID'],a[href*='/WorkingHoliday/default.aspx']");
      updateForm(value19.href);
      if (shouldSubmit) value19.click();else {
        {
          pushNotification("warning", "<b>大X: </b> 没有需要填写的内容，请点击表格详情进入表格");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      }
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz/WorkingHoliday".toLowerCase()) && pageHTML.includes("Working Holiday Visa Application Forms") && document.querySelector("a[href*='Application/Edit.aspx?ApplicationId']") && !document.querySelector("a[href*='Application/Submit.aspx?ApplicationId']")) {
      let value20 = document.querySelector("a[href*='Application/Edit.aspx?ApplicationId']");
      updateForm(value20.href);
      if (shouldSubmit) value20.click();else {
        {
          teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/28150#%E8%A1%A8%E6%A0%BC' target=\"_blank\"> 点此查看如何填写表格 </a>");
          pushNotification("warning", "<b>大X: </b> 没有需要填写的内容，请点击\"Edit\"进入表格");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      }
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz/WorkingHoliday".toLowerCase()) && pageHTML.includes("Working Holiday Visa Application Forms") && document.querySelector("a[href*='Application/Edit.aspx?ApplicationId']") && document.querySelector("a[href*='Application/Submit.aspx?ApplicationId']")) {
      let value21 = document.querySelector("a[href*='Application/Submit.aspx?ApplicationId']");
      updateForm(value21.href);
      if (shouldSubmit) value21.click();else {
        {
          teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/28150#Submit' target=\"_blank\"> 点此查看如何提交表格 </a>");
          pushNotification("warning", "<b>大X: </b> 没有需要填写的内容，请点击\"Submit\"提交表格");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      }
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz/WorkingHoliday".toLowerCase()) && pageHTML.includes("Working Holiday Visa Application Forms") && !document.querySelector("a[href*='Application/Edit.aspx?ApplicationId']") && !document.querySelector("a[href*='Application/Submit.aspx?ApplicationId']") && document.querySelector("a[href*='Application/Pay.aspx?']")) {
      if (shouldSubmit) document.querySelector("a[href*='Application/Pay.aspx?']").click();else {
        {
          teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/28150#%E4%BB%98%E6%AC%BE' target=\"_blank\"> 点此查看如何付款 </a>");
          pushNotification("warning", "<b>大X: </b> 没有需要填写的内容，请点击\"Pay\"开始付款");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      }
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz/WorkingHoliday".toLowerCase()) && pageHTML.includes("Working Holiday Visa Application Forms") && !document.querySelector("a[href*='Application/Edit.aspx?ApplicationId']") && !document.querySelector("a[href*='Application/Submit.aspx?ApplicationId']") && pageHTML.includes("<span id=\"ContentPlaceHolder1_applicationList_applicationsDataGrid_paymentStatusLabel_0\">Received")) {
      {
        noticeDuration = 10000000;
        pushNotification("success", "<b>大X: </b> 恭喜你已经成功抢到新西兰WHV名额，<b><a href='https://iwhver.com/7815' target=\"_blank\"> 点此查看材料准备攻略 </a></b>");
        setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
      }
      return;
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz".toLowerCase()) && pageHTML.includes("You can save your application details at any time") && pageHTML.includes("ContentPlaceHolder1_countryRepeater")) {
      if (shouldSubmit) document.querySelector("a[href*='CountryId=" + profile.nation + "']").click();else {
        {
          teaching && !shouldSubmit && pushNotification("info", "<b>大X:</b><a href='https://iwhver.com/28150#%E9%80%89%E5%8F%96%E5%9B%BD%E5%AE%B6' target=\"_blank\"> 点此查看如何选取国家 </a>");
          pushNotification("warning", "<b>大X: </b> 没有需要填写的内容，请自行选择申请的国家");
          pushNotification("error", "<b>大X: </b> <a href='https://iwhver.com/28150#%E5%85%B3%E4%BA%8E2P' target=\"_blank\">不要选日本/美国/芬兰，防止2P(点此了解更多) </a> ");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      }
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz/WorkingHoliday/Application/Create.aspx?CountryId".toLowerCase()) && pageHTML.includes("Unfortunately the available places for this Working Holiday Scheme have been filled")) {
      if (shouldSubmit) {
        {
          reload();
          pushNotification("success", "<b>大X: </b> 暂时没有名额，将按设置间隔刷新");
        }
        return;
      } else {
        {
          pushNotification("warning", "<b>大X: </b> 暂时没有名额，请尝试刷新本页面");
          setTitle("此页面仅含有刷新操作，大X仅自动填表模式下不会刷新");
        }
        return;
      }
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz/WorkingHoliday/Application/Create.aspx?CountryId".toLowerCase()) && pageHTML.includes("Scheme is available") && pageHTML.includes("To apply to come to New Zealand under the selected Working Holiday Scheme")) {
      if (shouldSubmit) document.querySelector("input[id*='applyNowButton']").click();else {
        {
          pushNotification("warning", "<b>大X: </b> 没有需要填写的内容，请点击\"APPLY NOW\"按钮，尝试获取表格");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      }
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz/WorkingHoliday/Application/Create.aspx".toLowerCase()) && pageHTML.includes("Multiple applications are not supported. All previous applications must be lodged before a new one can be created.") && pageHTML.includes("ContentPlaceHolder1_homeAnchor")) {
      if (shouldSubmit) document.querySelector("a[id*='ContentPlaceHolder1_homeAnchor']").click();else {
        {
          pushNotification("warning", "<b>大X: </b> 没有需要填写的内容，请点击页内链接返回主页");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      }
    } else if (pageURL.toLowerCase().includes("/WorkingHoliday/Wizard/Personal1.aspx".toLowerCase()) && pageHTML.includes("You should complete all of the pages in this section before proceeding to the next section") && pageHTML.includes("ContentPlaceHolder1_personDetails_familyNameTextBox")) {
      teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/28150#Personal_details_%E9%A1%B5' target=\"_blank\"> 点此查看如何填写本页 </a>");
      updateForm(pageURL);
      document.querySelector("input[id*='personDetails_givenName1Textbox']").value = profile.GivenName;
      document.querySelector("input[id*='personDetails_familyNameTextBox']").value = profile.FamilyName;
      NZselectOption(profile.Gender, "#ContentPlaceHolder1_personDetails_genderDropDownList");
      NZInputDate(profile.birth, "#ContentPlaceHolder1_personDetails_dateOfBirthDatePicker_DatePicker");
      NZselectOption(profile.birthCountry, "#ContentPlaceHolder1_personDetails_CountryDropDownList");
      document.querySelector("input[id*='address_streetNumberTextbox']").value = profile.addressStreetNumber;
      document.querySelector("input[id*='address_address1TextBox']").value = profile.addressStreetName;
      document.querySelector("input[id*='address_suburbTextBox']").value = profile.addressSuburb;
      document.querySelector("input[id*='address_cityTextBox']").value = profile.addressCity;
      NZselectOption(profile.residentCountry, "#ContentPlaceHolder1_addressContactDetails_address_countryDropDownList");
      document.querySelector("input[id*='contactDetails_emailAddressTextBox']").value = profile.email;
      NZselectOption("No", "#ContentPlaceHolder1_hasAgent_representedByAgentDropdownlist");
      NZselectOption("1", "#ContentPlaceHolder1_communicationMethod_communicationMethodDropDownList");
      NZselectOption("Yes", "#ContentPlaceHolder1_hasCreditCard_hasCreditCardDropDownlist");
      shouldSubmit && (document.querySelector("#ContentPlaceHolder1_wizardPageHeader_submitSuperLink") ? document.querySelector("#ContentPlaceHolder1_wizardPageHeader_submitSuperLink").click() : document.querySelector(".current").querySelector("img[src*='Images/SectionTick.svg']") ? document.querySelector(".innercontainer img[src*='Images/SectionCross.svg']") ? document.querySelector(".innercontainer img[src*='Images/SectionCross.svg']").parentNode.querySelector("input[id*='sectionTabs']").click() : document.querySelector("#ContentPlaceHolder1_wizardPageFooter_wizardPageNavigator_validateButton").click() : document.querySelector("#ContentPlaceHolder1_wizardPageHeader_nav_pageTabs_TabHeaders_tabButton_1").click());
    } else if (pageURL.toLowerCase().includes("/WorkingHoliday/Wizard/Personal2.aspx".toLowerCase()) && pageHTML.includes("Provide the details of the passport you intend to use to enter New Zealand.") && pageHTML.includes("ContentPlaceHolder1_identification_passportNumberTextBox")) {
      teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/28150#Identification%E9%A1%B5' target=\"_blank\"> 点此查看如何填写本页 </a>");
      updateForm(pageURL);
      document.querySelector("input[id*='identification_passportNumberTextBox']").value = profile.Passport;
      document.querySelector("input[id*='identification_confirmPassportNumberTextBox']").value = profile.Passport;
      NZInputDate(profile.PassportExpire, "#ContentPlaceHolder1_identification_passportExpiryDateDatePicker_DatePicker");
      NZselectOption(profile.personalIDType, "#ContentPlaceHolder1_identification_otherIdentificationDropdownlist");
      NZInputDate(profile.personalIDStart, "#ContentPlaceHolder1_identification_otherIssueDateDatePicker_DatePicker");
      profile.personalIDExpire && NZInputDate(profile.personalIDExpire, "#ContentPlaceHolder1_identification_otherExpiryDateDatePicker_DatePicker");
      shouldSubmit && (document.querySelector("#ContentPlaceHolder1_wizardPageHeader_submitSuperLink") ? document.querySelector("#ContentPlaceHolder1_wizardPageHeader_submitSuperLink").click() : document.querySelector(".innercontainer img[src*='Images/SectionCross.svg']") ? document.querySelector(".innercontainer img[src*='Images/SectionCross.svg']").parentNode.querySelector("input[id*='sectionTabs']").click() : document.querySelector(".current").querySelector("img[src*='Images/SectionCross.svg']") ? document.querySelector("#ContentPlaceHolder1_wizardPageHeader_nav_pageTabs_TabHeaders_tabButton_0").click() : document.querySelector("#ContentPlaceHolder1_wizardPageFooter_wizardPageNavigator_validateButton").click());
    } else if (pageURL.toLowerCase().includes("/WorkingHoliday/Wizard/Medical1.aspx".toLowerCase()) && pageHTML.includes("This section will help us determine whether you will meet our health requirements") && pageHTML.includes("s2id_ContentPlaceHolder1_medicalConditions_renalDialysisDropDownList")) {
      {
        teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/28150#Health%E9%A1%B5' target=\"_blank\"> 点此查看如何填写本页 </a>");
        updateForm(pageURL);
      }
      let value22 = document.querySelectorAll("select[id*='medicalConditions']");
      for (let value23 = 0; value23 < value22.length; value23++) {
        !value22[value23].id.includes("tbRiskDropDownList") && NZselectOption("No", "#" + value22[value23].id);
      }
      {
        NZselectOption(profile.TBCountry, "#ContentPlaceHolder1_medicalConditions_tbRiskDropDownList");
        shouldSubmit && NZSaveButtonSelect();
      }
    } else if (pageURL.toLowerCase().includes("/WorkingHoliday/Wizard/Character.aspx".toLowerCase()) && pageHTML.includes("This section will help us determine whether you are acceptable on character grounds for a visa") && pageHTML.includes("s2id_ContentPlaceHolder1_character_imprisonment5YearsDropDownList")) {
      {
        teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/28150#Character%E9%A1%B5' target=\"_blank\"> 点此查看如何填写本页 </a>");
        updateForm(pageURL);
      }
      let value24 = document.querySelectorAll("select[id*='character']");
      for (let value25 = 0; value25 < value24.length; value25++) {
        !value24[value25].id.includes("character_countryDropDownList") && NZselectOption("No", "#" + value24[value25].id);
      }
      shouldSubmit && NZSaveButtonSelect();
    } else if (pageURL.toLowerCase().includes("/WorkingHoliday/Wizard/WorkingHolidaySpecific.aspx".toLowerCase()) && pageHTML.includes("Have you previously been issued a New Zealand Working Holiday Visa") && pageHTML.includes("s2id_ContentPlaceHolder1_offshoreDetails_commonWHSQuestions_previousWhsPermitVisaDropDownList")) {
      teaching && !shouldSubmit && pushNotification("info", "<b>大X教学提示:</b><a href='https://iwhver.com/28150#Working_Holiday_Specific%E9%A1%B5' target=\"_blank\"> 点此查看如何填写本页 </a>");
      updateForm(pageURL);
      NZselectOption("No", "#ContentPlaceHolder1_offshoreDetails_commonWHSQuestions_previousWhsPermitVisaDropDownList");
      NZselectOption("Yes", "#ContentPlaceHolder1_offshoreDetails_commonWHSQuestions_sufficientFundsHolidayDropDownList");
      NZInputDate(profile.planNZDate, "#ContentPlaceHolder1_offshoreDetails_intendedTravelDateDatePicker_DatePicker");
      NZselectOption("2", "#ContentPlaceHolder1_offshoreDetails_lengthOfStay_lengthOfStayDropDownList");
      NZselectOption(profile.beenInNZ, "#ContentPlaceHolder1_offshoreDetails_beenToNzDropDownList");
      profile.beenInNZ === "Yes" && NZInputDate(profile.beenInNZDate, "#ContentPlaceHolder1_offshoreDetails_whenInNZDatePicker_DatePicker");
      NZselectOption("Yes", "#ContentPlaceHolder1_offshoreDetails_requirementsQuestions_sufficientFundsOnwardTicketDropDownList");
      NZselectOption("Yes", "#ContentPlaceHolder1_offshoreDetails_requirementsQuestions_readRequirementsDropDownList");
      shouldSubmit && NZSaveButtonSelect();
    } else if (pageURL.toLowerCase().includes("/WorkingHoliday/Application/Submit.aspx".toLowerCase()) && pageHTML.includes("after your application has been submitted. Before you complete") && pageHTML.includes("ContentPlaceHolder1_medicalInsuranceCheckBox")) {
      captchaRequired = !![];
      teaching && !shouldSubmit && pushNotification("warning", "<b>大X:</b><a href='https://iwhver.com/28150#Submit' target=\"_blank\"> 本页全部打钩，完成验证码，并点击提交按钮即可 </a>");
      updateForm(pageURL);
      document.querySelectorAll("input[id*='CheckBox'],input[id*='Checkbox']").forEach(value26 => value26.checked = !![]);
    } else if (pageURL.toLowerCase().includes("captcha".toLowerCase()) && pageHTML.includes("Please complete the CAPTCHA") && pageHTML.includes("This section must be completed before you can submit the application")) captchaRequired = !![];else if (pageURL.toLowerCase().includes("/WorkingHoliday/Application/Submit.aspx".toLowerCase()) && pageHTML.includes("Submit Received") && pageHTML.includes("Please note that you must pay the application fee before your place is secured")) {
      if (shouldSubmit) document.querySelector("a[id*='ContentPlaceHolder1_payAnchor']").click();else {
        {
          teaching && !shouldSubmit && pushNotification("info", "<b>大X:</b><a href='https://iwhver.com/28150#%E4%BB%98%E6%AC%BE' target=\"_blank\"> 点此查看如何付款 </a>");
          pushNotification("warning", "<b>大X教学提示: </b> 没有需要填写的内容，请点击\"Pay Now\"按钮开始付款");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      }
    } else if (pageURL.toLowerCase().includes("onlineservices.immigration.govt.nz/WorkingHoliday/Application/Pay.aspx".toLowerCase()) && pageHTML.includes("Paying for Your Application") && pageHTML.includes("The total charge to submit your Working Holiday Scheme application is")) {
      teaching && !shouldSubmit && pushNotification("info", "<b>大X:</b><a href='https://iwhver.com/28150#%E4%BB%98%E6%AC%BE' target=\"_blank\"> 点此查看如何付款 </a>");
      if (shouldSubmit) document.querySelector("a[id*='ContentPlaceHolder1_onlinePaymentAnchor']").click();else {
        {
          pushNotification("warning", "<b>大X教学提示: </b> 没有需要填写的内容，请点击\"Pay Now\"按钮开始付款");
          setTitle("此页面仅含有点击操作，大X仅自动填表模式下不会点击");
        }
        return;
      }
    } else if (pageURL.toLowerCase().includes("/PaymentGateway/OnLinePayment.aspx?".toLowerCase()) && pageHTML.includes("Please provide the name of the person who is paying the fee") && pageHTML.includes("_ctl0_ContentPlaceHolder1_payerNameTextBox")) {
      {
        noticeDuration = 10000000;
        pushNotification("warning", "<b>大X: </b> 前方为付款页，请填写付款人姓名(大写英文)，点击OK按钮前往下一页。付款页含有个人敏感信息，本插件将处于禁用状态，请自行手动完成。祝你好运！");
        teaching && !shouldSubmit && pushNotification("info", "<b>大X:</b><a href='https://iwhver.com/28150#%E4%BB%98%E6%AC%BE' target=\"_blank\"> 点此查看如何付款 </a>");
        setTitle("大X将不对此页进行操作");
      }
      return;
    } else recognized = ![];
    recognized ? (setTitle("此页面可被大X插件操作，点击按钮将执行自动自动填表+点击操作"), captchaRequired ? teaching && pushNotification("error", "<b>大X:</b> 请完成验证码填写") : shouldSubmit ? pushNotification("success", "<b>大X: </b> 已填写并提交/已点击") : pushNotification("success", "<b>大X: </b> 已填写空格")) : (setTitle("大X未能识别本页面"), shouldSubmit ? cachedInfo.setting["auto-jump"] === "1" ? (pushNotification("warning", "<b>大X: </b> 无法识别该页，开始自动跳转到：\n" + cachedInfo.setting["jump-url"]), false, navigate(cachedInfo.setting["jump-url"])) : (noticeDuration = 10000000, pushNotification("error", "<b>大X: </b> 无法识别该页")) : setTitle("无法识别该页"));
  } catch (value27) {
    {
      pushNotification("error", "<b>大X: </b> 未能对此页进行操作");
      setTitle("大X未能对此页进行操作");
      false;
    }
  }
}
function NZSaveButtonSelect() {
  document.querySelector("#ContentPlaceHolder1_wizardPageHeader_submitSuperLink") ? document.querySelector("#ContentPlaceHolder1_wizardPageHeader_submitSuperLink").click() : document.querySelector(".innercontainer img[src*='Images/SectionCross.svg']") ? document.querySelector(".innercontainer img[src*='Images/SectionCross.svg']").parentNode.querySelector("input[id*='sectionTabs']").click() : document.querySelector(".current").querySelector("input[id*='sectionTabs']").click();
}
runScript({sender: capabilities.manual ? 'pageAction' : 'pageLoaded'});
}
