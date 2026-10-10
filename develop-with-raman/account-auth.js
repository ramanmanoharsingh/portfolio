(() => {
  'use strict';
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const form = $('#account-form');
  if (!form) return;
  const state = { mode: 'login', busy: false, client: window.supabaseClient || null };
  const message = $('#auth-message');
  const submit = $('#auth-submit');
  const submitLabel = $('#auth-submit-label');
  const nameField = $('#name-field');
  const confirmField = $('#confirm-field');
  const rememberRow = $('#remember-row');
  const forgotLink = $('#forgot-link');
  const tabs = $$('.auth-tab');
  const strength = $('#password-strength');
  const strengthLabel = $('#auth-password-strength-label');
  const password = $('#auth-password');
  const confirmPassword = $('#auth-confirm-password');

  const showMessage = (text, kind='error') => { message.textContent=text; message.dataset.kind=kind; message.setAttribute('role',kind==='error'?'alert':'status'); };
  const clearMessage = () => { message.textContent=''; delete message.dataset.kind; message.removeAttribute('role'); };
  const setBusy = (busy, label) => { state.busy=busy; submit.disabled=busy; submitLabel.textContent=busy?'Please wait…':label; submit.setAttribute('aria-busy',String(busy)); };
  const setMode = mode => {
    state.mode=mode; clearMessage();
    const login=mode==='login', signup=mode==='signup', reset=mode==='reset';
    tabs.forEach(tab=>{const active=tab.dataset.mode===mode;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
    $('#auth-title').textContent=login?'Welcome back.':signup?'Let’s get started.':'Reset your password.';
    $('#auth-description').textContent=login?'Sign in to pick up where your project left off.':signup?'Create your account to start working with Raman.':'We’ll email you a secure link to choose a new password.';
    nameField.classList.toggle('auth-hidden',!signup);$('#auth-name').required=signup;
    confirmField.classList.toggle('auth-hidden',!signup);confirmPassword.required=signup;
    rememberRow.classList.toggle('auth-hidden',!login);$('#auth-social-section').classList.toggle('auth-hidden',reset);
    $('#auth-legal').classList.toggle('auth-hidden',reset);$('#auth-terms-row').classList.toggle('auth-hidden',!signup);$('#auth-back-login').classList.toggle('auth-hidden',!reset);forgotLink.classList.toggle('auth-hidden',!login);
    $('#auth-tabs').classList.toggle('auth-hidden',reset);
    submitLabel.textContent=login?'Sign in to your account':signup?'Create your account':'Send reset link';
    password.autocomplete=login?'current-password':'new-password';
    password.required=!reset;password.disabled=reset;password.classList.toggle('auth-hidden',reset);
    $('#password-field-label').classList.toggle('auth-hidden',reset);
    strength.dataset.visible=String(signup);strengthLabel.classList.toggle('auth-hidden',!signup);$('#auth-password-strength-label').classList.toggle('auth-hidden',!signup);
    if(reset){$('#auth-password-label').textContent='Email address';$('#auth-email').focus();}
    else {$('#auth-password-label').textContent='Password';$('#auth-email').focus();}
  };
  const getClient = () => {
    const remember=$('#auth-remember')?.checked!==false;
    document.cookie='portal_session='+(remember?'0':'1')+'; Path=/; SameSite=Lax; Secure'+(remember?'; Max-Age=31536000':'');
    document.cookie=remember?'portal_session=; Max-Age=0; Path=/; SameSite=Lax':'portal_session=1; Max-Age=86400; Path=/; SameSite=Lax';
    if(typeof window.createPortalSupabaseClient==='function'){state.client=window.createPortalSupabaseClient(remember);return state.client;}
    if(window.supabaseClient)return window.supabaseClient;
    throw new Error('The authentication service did not load. Please refresh and try again.');
  };
  const scorePassword = value => {if(!value)return 0;let score=0;if(value.length>=8)score++;if(value.length>=12)score++;if(/[a-z]/.test(value)&&/[A-Z]/.test(value))score++;if(/\d/.test(value)||/[^A-Za-z0-9]/.test(value))score++;return Math.min(score,4);};
  const updateStrength = () => {const score=scorePassword(password.value);strength.dataset.level=String(score);strengthLabel.textContent=!password.value?'Use at least 8 characters':['','Needs more variety','Fair password','Good password','Strong password'][score];};
  const humanError = error => {
    const raw=String(error?.message||'Something went wrong. Please try again.');
    if(/invalid login credentials/i.test(raw))return 'Email or password is incorrect. Check your details and try again.';
    if(/email not confirmed/i.test(raw))return 'Please verify your email using the confirmation link we sent you.';
    if(/user already registered/i.test(raw))return 'An account with this email already exists. Try signing in instead.';
    if(/password should be at least/i.test(raw))return 'Choose a longer password that meets the minimum length requirement.';
    if(/rate limit/i.test(raw))return 'Too many attempts in a short time. Please wait a moment and try again.';
    if(/provider.*not enabled|unsupported provider/i.test(raw))return 'This social sign-in provider is not configured yet. Please use email and password for now.';
    return raw;
  };
  tabs.forEach(tab=>tab.addEventListener('click',()=>setMode(tab.dataset.mode)));
  $('#auth-show-password').addEventListener('click',()=>{const reveal=password.type==='password';password.type=reveal?'text':'password';$('#auth-show-password').textContent=reveal?'Hide':'Show';$('#auth-show-password').setAttribute('aria-pressed',String(reveal));});
  $('#auth-show-confirm').addEventListener('click',()=>{const reveal=confirmPassword.type==='password';confirmPassword.type=reveal?'text':'password';$('#auth-show-confirm').textContent=reveal?'Hide':'Show';});
  password.addEventListener('input',updateStrength);
  forgotLink.addEventListener('click',event=>{event.preventDefault();setMode('reset');});
  $('#auth-back-login').addEventListener('click',event=>{event.preventDefault();setMode('login');});
  $('#auth-back-home').addEventListener('click',event=>{event.preventDefault();location.href='/';});
  $$('.auth-social').forEach(button=>button.addEventListener('click',async()=>{clearMessage();try{const provider=button.dataset.provider;const {error}=await getClient().auth.signInWithOAuth({provider,options:{redirectTo:location.origin+'/auth-callback.html',...(provider==='google'?{scopes:'email'}:{})}});if(error)throw error;}catch(error){showMessage(humanError(error));}}));
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(state.busy)return;clearMessage();
    const email=$('#auth-email').value.trim(),pass=password.value;
    if(!email){showMessage('Enter your email address.');$('#auth-email').focus();return;}
    if(state.mode!=='reset'&&!pass){showMessage('Enter your password.');password.focus();return;}
    if(state.mode==='signup'){showMessage('Client accounts are invitation-only. Please use the invitation email sent after your project is accepted.');return;}
    setBusy(true,'');
    try{
      const client=getClient();
      if(state.mode==='login'){
        const {data,error}=await client.auth.signInWithPassword({email,password:pass});if(error)throw error;
        if(!data.session)throw new Error('Your session could not be started. Please try again.');
        showMessage('Signed in successfully. Opening your workspace…','success');location.assign('/welcome.html');
      }else{
        const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/reset-password.html'});if(error)throw error;
        showMessage('If an account exists for that email, a password-reset link will arrive shortly.','success');
      }
    }catch(error){showMessage(humanError(error));}
    finally{setBusy(false,state.mode==='login'?'Sign in to your account':state.mode==='signup'?'Create your account':'Send reset link');}
  });
  $('#auth-email').addEventListener('input',()=>{if(message.dataset.kind==='error')clearMessage();});
  setMode('login');
})();