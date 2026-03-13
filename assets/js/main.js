/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById('nav-menu'),
      navToggle = document.getElementById('nav-toggle'),
      navClose = document.getElementById('nav-close')

navToggle.addEventListener('click', () => navMenu.classList.add('show-menu'))
navClose.addEventListener('click',  () => navMenu.classList.remove('show-menu'))

/*=============== SEARCH ===============*/
const search      = document.getElementById('search'),
      searchBtn   = document.getElementById('search-btn'),
      searchClose = document.getElementById('search-close'),
      searchForm  = document.getElementById('search-form'),
      searchInput = document.getElementById('search-input')

searchBtn.addEventListener('click',   () => search.classList.add('show-search'))
searchClose.addEventListener('click', () => search.classList.remove('show-search'))

searchForm.addEventListener('submit', (event) => {
   event.preventDefault()

   const query = searchInput.value.trim()
   const targetUrl = new URL(window.location.href)

   if (query) {
      targetUrl.searchParams.set('q', query)
   } else {
      targetUrl.searchParams.delete('q')
   }

   window.location.href = targetUrl.toString()
})

/*=============== LOGIN / REGISTER TOGGLE ===============*/
const loginPanel      = document.getElementById('login'),
      registerPanel   = document.getElementById('register'),
      changeUsernamePanel = document.getElementById('change-username'),
      resetPasswordPanel = document.getElementById('reset-password'),
   profileModal    = document.getElementById('profile-modal'),
      loginBtn        = document.getElementById('login-btn'),
      loginClose      = document.getElementById('login-close'),
      registerClose   = document.getElementById('register-close'),
      signupLink      = document.getElementById('signup-link'),
      loginLink       = document.getElementById('login-link'),
      forgotPasswordLink = document.getElementById('forgot-password-link'),
      resetPasswordClose = document.getElementById('reset-password-close'),
   backToLoginLink = document.getElementById('back-to-login-link'),
   profileClose    = document.getElementById('profile-close')

const showLogin    = () => { loginPanel.classList.add('show-login');       registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login') }
const showRegister = () => { registerPanel.classList.add('show-register'); loginPanel.classList.remove('show-login');    changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login') }
const showResetPassword = () => { resetPasswordPanel.classList.add('show-login'); loginPanel.classList.remove('show-login'); registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); profileModal.classList.remove('show-login') }
const hideAll      = () => { loginPanel.classList.remove('show-login');    registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login') }

loginBtn.addEventListener('click', showLogin)
loginClose.addEventListener('click', hideAll)
registerClose.addEventListener('click', hideAll)
signupLink.addEventListener('click', (e) => {
   e.preventDefault()
   showRegister()
   emailCodeWrap.style.display = 'none'
   regVerifyCode.value = ''
   sendCodeBtn.disabled = false
   sendCodeBtn.textContent = 'Send Code'
   if (sendCodeTimer) { clearInterval(sendCodeTimer); sendCodeTimer = null }
   clearMsg('register-message')
})
loginLink.addEventListener('click',  (e) => { e.preventDefault(); showLogin() })
forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); showResetPassword() })
resetPasswordClose.addEventListener('click', hideAll)
backToLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLogin() })
profileClose.addEventListener('click', hideAll)

/*=============== AVATAR PREVIEW ===============*/
const avatarInput       = document.getElementById('avatar-input')
const avatarPreview     = document.getElementById('avatar-preview')
const avatarPlaceholder = document.getElementById('avatar-placeholder')

avatarInput.addEventListener('change', () => {
   const file = avatarInput.files[0]
   if (!file) return
   const reader = new FileReader()
   reader.onload = (e) => {
      avatarPreview.src = e.target.result
      avatarPreview.style.display = 'block'
      avatarPlaceholder.style.display = 'none'
   }
   reader.readAsDataURL(file)
})

/*=============== HELPER – show message in form ===============*/
function showMsg(id, text, type) {
   const el = document.getElementById(id)
   el.textContent = text
   el.className = 'login__message ' + type
}
function clearMsg(id) {
   const el = document.getElementById(id)
   el.textContent = ''
   el.className = 'login__message'
}

/*=============== NAV – reflect logged-in user ===============*/
const navUser     = document.getElementById('nav-user')
const navAvatar   = document.getElementById('nav-avatar')
const navUsername = document.getElementById('nav-username')
const profileBtn  = document.getElementById('profile-btn')
const logoutBtn   = document.getElementById('logout-btn')
const profileAvatarInput  = document.getElementById('profile-avatar-input')
const profileAvatarButton = document.getElementById('profile-avatar-button')
const profileAvatarImage  = document.getElementById('profile-avatar-image')
const profileUsername     = document.getElementById('profile-username')
const profileForm         = document.getElementById('profile-form')
const profileFullNameInput = document.getElementById('profile-full-name-input')
const profileUsernameInput = document.getElementById('profile-username-input')
const profileDeletePasswordInput = document.getElementById('profile-delete-password')
const profileSaveBtn       = document.getElementById('profile-save-btn')
const profileDeleteBtn     = document.getElementById('profile-delete-btn')

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=352C59&color=fff&name='
let currentUser = null

function getAvatarUrl(user) {
   return user.avatar
      ? '/' + user.avatar
      : DEFAULT_AVATAR + encodeURIComponent(user.full_name)
}

function updateProfileView(user) {
   profileAvatarImage.src  = getAvatarUrl(user)
   profileFullNameInput.value = user.full_name
   profileUsernameInput.value = user.username
   profileUsername.textContent = '@' + user.username
}

function setLoggedIn(user) {
   currentUser = user
   loginBtn.style.display   = 'none'
   navUser.style.display    = 'flex'
   navUsername.textContent  = user.username
   navAvatar.src = getAvatarUrl(user)
   updateProfileView(user)
}

function setLoggedOut() {
   currentUser = null
   loginBtn.style.display  = ''
   navUser.style.display   = 'none'
   navAvatar.src           = ''
   navUsername.textContent = ''
   profileAvatarImage.src  = ''
   profileFullNameInput.value = ''
   profileUsernameInput.value = ''
   profileDeletePasswordInput.value = ''
   profileUsername.textContent = ''
   hideAll()
}

function showProfileModal() {
   if (!currentUser) return
   clearMsg('profile-message')
   updateProfileView(currentUser)
   profileDeletePasswordInput.value = ''
   hideAll()
   profileModal.classList.add('show-login')
}

profileBtn.addEventListener('click', showProfileModal)
profileAvatarButton.addEventListener('click', () => profileAvatarInput.click())

profileAvatarInput.addEventListener('change', async () => {
   const avatarFile = profileAvatarInput.files[0]
   if (!avatarFile) return

   clearMsg('profile-message')
   profileAvatarButton.disabled = true

   try {
      const formData = new FormData()
      formData.append('avatar', avatarFile)

      const res = await fetch('/api/auth/update-avatar', {
         method: 'POST',
         credentials: 'include',
         body: formData
      })
      const data = await res.json()

      if (!res.ok) {
         showMsg('profile-message', data.error || 'Could not update profile picture.', 'error')
      } else {
         showMsg('profile-message', data.message || 'Profile picture updated!', 'success')
         setLoggedIn(data.user)
      }
   } catch (_) {
      showMsg('profile-message', 'Cannot reach server.', 'error')
   } finally {
      profileAvatarInput.value = ''
      profileAvatarButton.disabled = false
   }
})

profileUsernameInput.addEventListener('input', () => {
   const value = profileUsernameInput.value.trim()
   profileUsername.textContent = value ? '@' + value : '@'
})

profileForm.addEventListener('submit', async (e) => {
   e.preventDefault()
   clearMsg('profile-message')

   const full_name = profileFullNameInput.value.trim()
   const username  = profileUsernameInput.value.trim()

   if (!full_name || !username) {
      return showMsg('profile-message', 'Full name and username are required.', 'error')
   }

   profileSaveBtn.disabled = true
   profileSaveBtn.textContent = 'Saving…'

   try {
      const res = await fetch('/api/auth/update-profile', {
         method: 'POST',
         credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ full_name, username })
      })
      const data = await res.json()

      if (!res.ok) {
         showMsg('profile-message', data.error || 'Could not update profile.', 'error')
      } else {
         showMsg('profile-message', data.message || 'Profile updated!', 'success')
         setLoggedIn(data.user)
      }
   } catch (_) {
      showMsg('profile-message', 'Cannot reach server.', 'error')
   } finally {
      profileSaveBtn.disabled = false
      profileSaveBtn.textContent = 'Save Changes'
   }
})

profileDeleteBtn.addEventListener('click', async () => {
   if (!currentUser) return

   const password = profileDeletePasswordInput.value
   if (!password) {
      return showMsg('profile-message', 'Please enter your password to delete the account.', 'error')
   }

   const confirmed = window.confirm('Are you sure you want to delete your account? This cannot be undone.')
   if (!confirmed) return

   clearMsg('profile-message')
   profileDeleteBtn.disabled = true
   profileSaveBtn.disabled = true
   profileDeleteBtn.textContent = 'Deleting…'

   try {
      const res = await fetch('/api/auth/delete-account', {
         method: 'DELETE',
         credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ password })
      })
      const data = await res.json()

      if (!res.ok) {
         showMsg('profile-message', data.error || 'Could not delete account.', 'error')
      } else {
         setLoggedOut()
         showLogin()
         showMsg('login-message', data.message || 'Account deleted successfully.', 'success')
      }
   } catch (_) {
      showMsg('profile-message', 'Cannot reach server.', 'error')
   } finally {
      profileDeleteBtn.disabled = false
      profileSaveBtn.disabled = false
      profileDeleteBtn.textContent = 'Delete Account'
   }
})

/*=============== CHECK SESSION ON LOAD ===============*/
async function checkSession() {
   try {
      const res  = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
         const data = await res.json()
         setLoggedIn(data.user)
         if (data.needsUsernameUpdate) {
            hideAll()
            changeUsernamePanel.classList.add('show-login')
         }
      }
   } catch (_) { /* not logged in */ }
}
checkSession()

/*=============== LOGOUT ===============*/
logoutBtn.addEventListener('click', async () => {
   await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
   setLoggedOut()
})

/*=============== LOGIN ===============*/
document.getElementById('login-form').addEventListener('submit', async (e) => {
   e.preventDefault()
   clearMsg('login-message')

   const identifier = document.getElementById('identifier').value.trim()
   const password   = document.getElementById('login-password').value

   const btn = document.getElementById('login-submit')
   btn.disabled = true
   btn.textContent = 'Logging in…'

   try {
      const res  = await fetch('/api/auth/login', {
         method:      'POST',
         credentials: 'include',
         headers:     { 'Content-Type': 'application/json' },
         body:        JSON.stringify({ identifier, password })
      })
      const data = await res.json()

      if (!res.ok) {
         showMsg('login-message', data.error, 'error')
      } else {
         showMsg('login-message', data.message, 'success')
         setLoggedIn(data.user)
         setTimeout(() => { hideAll(); clearMsg('login-message') }, 800)
      }
   } catch (_) {
      showMsg('login-message', 'Cannot reach server. Is it running?', 'error')
   } finally {
      btn.disabled = false
      btn.textContent = 'Log In'
   }
})

/*=============== REGISTER ===============*/
const sendCodeBtn   = document.getElementById('send-code-btn')
const emailCodeWrap = document.getElementById('email-code-wrap')
const regVerifyCode = document.getElementById('reg-verify-code')
let   sendCodeTimer = null

sendCodeBtn.addEventListener('click', async () => {
   const email = document.getElementById('reg-email').value.trim()
   if (!email) {
      return showMsg('register-message', 'Please enter your email first.', 'error')
   }
   if (!/^[^\s@]+@tha\.de$/i.test(email)) {
      return showMsg('register-message', 'Only @tha.de email addresses are allowed.', 'error')
   }

   clearMsg('register-message')
   sendCodeBtn.disabled = true
   sendCodeBtn.textContent = 'Sending…'

   try {
      const res  = await fetch('/api/auth/send-verification', {
         method:      'POST',
         credentials: 'include',
         headers:     { 'Content-Type': 'application/json' },
         body:        JSON.stringify({ email })
      })
      const data = await res.json()

      if (!res.ok) {
         showMsg('register-message', data.error, 'error')
         sendCodeBtn.disabled = false
         sendCodeBtn.textContent = 'Send Code'
      } else {
         showMsg('register-message', data.message, 'success')
         emailCodeWrap.style.display = 'block'
         regVerifyCode.focus()
         if (sendCodeTimer) clearInterval(sendCodeTimer)
         let countdown = 60
         sendCodeBtn.textContent = `Resend (${countdown}s)`
         sendCodeTimer = setInterval(() => {
            countdown--
            sendCodeBtn.textContent = `Resend (${countdown}s)`
            if (countdown <= 0) {
               clearInterval(sendCodeTimer)
               sendCodeTimer = null
               sendCodeBtn.disabled = false
               sendCodeBtn.textContent = 'Resend Code'
            }
         }, 1000)
      }
   } catch (_) {
      showMsg('register-message', 'Cannot reach server.', 'error')
      sendCodeBtn.disabled = false
      sendCodeBtn.textContent = 'Send Code'
   }
})

document.getElementById('register-form').addEventListener('submit', async (e) => {
   e.preventDefault()
   clearMsg('register-message')

   const username         = document.getElementById('reg-username').value.trim()
   const full_name        = document.getElementById('reg-name').value.trim()
   const email            = document.getElementById('reg-email').value.trim()
   const password         = document.getElementById('reg-password').value
   const confirm_password = document.getElementById('reg-confirm').value
   const verificationCode = regVerifyCode.value.trim()
   const avatarFile       = document.getElementById('avatar-input').files[0]

   // Basic client-side validation
   if (!username || !full_name || !email || !password || !confirm_password) {
      return showMsg('register-message', 'Please fill in all fields.', 'error')
   }
   if (!verificationCode) {
      return showMsg('register-message', 'Please verify your email first – click “Send Code”.', 'error')
   }
   if (!/^[^\s@]+@tha\.de$/i.test(email)) {
      return showMsg('register-message', 'Only @tha.de email addresses are allowed.', 'error')
   }
   if (password !== confirm_password) {
      return showMsg('register-message', 'Passwords do not match.', 'error')
   }

   const btn = document.getElementById('register-submit')
   btn.disabled = true
   btn.textContent = 'Creating account…'

   try {
      const formData = new FormData()
      formData.append('username',         username)
      formData.append('full_name',        full_name)
      formData.append('email',            email)
      formData.append('password',         password)
      formData.append('confirm_password', confirm_password)
      formData.append('verificationCode', verificationCode)
      if (avatarFile) formData.append('avatar', avatarFile)

      const res  = await fetch('/api/auth/register', {
         method:      'POST',
         credentials: 'include',
         body:        formData
      })
      const data = await res.json()

      if (!res.ok) {
         showMsg('register-message', data.error, 'error')
      } else {
         showMsg('register-message', data.message, 'success')
         setLoggedIn(data.user)
         setTimeout(() => { hideAll(); clearMsg('register-message') }, 800)
      }
   } catch (_) {
      showMsg('register-message', 'Cannot reach server. Is it running?', 'error')
   } finally {
      btn.disabled = false
      btn.textContent = 'Sign Up'
   }
})

/*=============== CHANGE USERNAME ===============*/
document.getElementById('change-username-form').addEventListener('submit', async (e) => {
   e.preventDefault()
   clearMsg('change-username-message')

   const newUsername = document.getElementById('new-username').value.trim()

   const btn = document.getElementById('change-username-submit')
   btn.disabled = true
   btn.textContent = 'Updating…'

   try {
      const res  = await fetch('/api/auth/update-username', {
         method:      'POST',
         credentials: 'include',
         headers:     { 'Content-Type': 'application/json' },
         body:        JSON.stringify({ newUsername })
      })
      const data = await res.json()

      if (!res.ok) {
         showMsg('change-username-message', data.error, 'error')
      } else {
         showMsg('change-username-message', data.message, 'success')
         setLoggedIn(data.user)
         setTimeout(() => { hideAll(); clearMsg('change-username-message') }, 1000)
      }
   } catch (_) {
      showMsg('change-username-message', 'Cannot reach server.', 'error')
   } finally {
      btn.disabled = false
      btn.textContent = 'Update Username'
   }
})

/*=============== RESET PASSWORD ===============*/
document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
   e.preventDefault()
   clearMsg('reset-password-message')

   const identifier       = document.getElementById('reset-identifier').value.trim()
   const newPassword      = document.getElementById('reset-new-password').value
   const confirmPassword  = document.getElementById('reset-confirm-password').value

   // Client-side validation
   if (!identifier || !newPassword || !confirmPassword) {
      return showMsg('reset-password-message', 'All fields are required.', 'error')
   }

   if (newPassword !== confirmPassword) {
      return showMsg('reset-password-message', 'Passwords do not match.', 'error')
   }

   const btn = document.getElementById('reset-password-submit')
   btn.disabled = true
   btn.textContent = 'Resetting…'

   try {
      const res  = await fetch('/api/auth/reset-password', {
         method:      'POST',
         credentials: 'include',
         headers:     { 'Content-Type': 'application/json' },
         body:        JSON.stringify({ identifier, newPassword, confirmPassword })
      })
      const data = await res.json()

      if (!res.ok) {
         showMsg('reset-password-message', data.error, 'error')
      } else {
         showMsg('reset-password-message', data.message, 'success')
         setTimeout(() => { hideAll(); clearMsg('reset-password-message') }, 1500)
      }
   } catch (_) {
      showMsg('reset-password-message', 'Cannot reach server.', 'error')
   } finally {
      btn.disabled = false
      btn.textContent = 'Reset Password'
   }
})

