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

const staticModalTriggers = document.querySelectorAll('[data-modal-target]')
const staticModalCloseButtons = document.querySelectorAll('[data-modal-close]')
const staticModalPanels = Array.from(document.querySelectorAll('.info-modal'))
const imprintArmandLink = document.getElementById('imprint-armand-link')
const imprintJostLink = document.getElementById('imprint-jost-link')

const projectContactElements = {
   armand: {
      fallback: {
         full_name: 'Armand Patrick Asztalos',
         username: 'armand',
         email: 'armand.patrick.asztalos@tha.de'
      },
      avatar: document.getElementById('armand-modal-avatar'),
      name: document.getElementById('armand-modal-name'),
      username: document.getElementById('armand-modal-username'),
      email: document.getElementById('armand-modal-email'),
      imprintLink: imprintArmandLink
   },
   jost: {
      fallback: {
         full_name: 'Jost Witthauer',
         username: 'jost',
         email: 'jost.witthauer@tha.de'
      },
      avatar: document.getElementById('jost-modal-avatar'),
      name: document.getElementById('jost-modal-name'),
      username: document.getElementById('jost-modal-username'),
      email: document.getElementById('jost-modal-email'),
      imprintLink: imprintJostLink
   }
}

function hideStaticModals() {
   staticModalPanels.forEach((panel) => panel.classList.remove('show-login'))
}

const showLogin    = () => { hideStaticModals(); loginPanel.classList.add('show-login');       registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login') }
const showRegister = () => { hideStaticModals(); registerPanel.classList.add('show-register'); loginPanel.classList.remove('show-login');    changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login') }
const showResetPassword = () => { hideStaticModals(); resetPasswordPanel.classList.add('show-login'); loginPanel.classList.remove('show-login'); registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); profileModal.classList.remove('show-login') }
const hideAll      = () => { loginPanel.classList.remove('show-login');    registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); hideStaticModals() }

function showStaticModal(modalId) {
   const modal = document.getElementById(modalId)
   if (!modal) return

   hideAll()
   modal.classList.add('show-login')
}

loginBtn.addEventListener('click', showLogin)
loginClose.addEventListener('click', hideAll)
registerClose.addEventListener('click', hideAll)
signupLink.addEventListener('click', (e) => {
   e.preventDefault()
   showRegister()
   emailCodeWrap.style.display = 'none'
   regVerifyCode.value = ''
   sendCodeBtn.disabled = false
   sendCodeBtn.textContent = 'Code senden'
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
const profileDeleteNote = document.getElementById('profile-delete-note')
const profileSaveBtn       = document.getElementById('profile-save-btn')
const profileDeleteBtn     = document.getElementById('profile-delete-btn')

const PROTECTED_EMAILS = new Set([
   'armand.patrick.asztalos@tha.de',
   'jost.witthauer@tha.de'
])

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=352C59&color=fff&name='
let currentUser = null

function getDisplayUser(contact, fallback) {
   return contact || fallback
}

function setImprintContactLink(link, contact, fallback) {
   if (!link) return

   const displayUser = getDisplayUser(contact, fallback)
   link.textContent = `${displayUser.full_name}, ${displayUser.email}`
}

function updateProjectContactModal(contactKey, contact) {
   const elements = projectContactElements[contactKey]
   if (!elements) return

   const displayUser = getDisplayUser(contact, elements.fallback)

   elements.avatar.src = getAvatarUrl(displayUser)
   elements.name.textContent = displayUser.full_name
   elements.username.textContent = `@${displayUser.username}`
   elements.email.textContent = displayUser.email
   elements.email.href = `mailto:${displayUser.email}`

   setImprintContactLink(elements.imprintLink, contact, elements.fallback)
}

async function refreshProjectContacts() {
   try {
      const response = await fetch('/api/auth/project-contacts', { credentials: 'include' })
      if (!response.ok) throw new Error('Kontakte konnten nicht geladen werden')

      const data = await response.json()
      updateProjectContactModal('armand', data.contacts?.armand || null)
      updateProjectContactModal('jost', data.contacts?.jost || null)
   } catch (_) {
      updateProjectContactModal('armand', null)
      updateProjectContactModal('jost', null)
   }
}

function isProtectedUser(user) {
   return Boolean(user?.email) && PROTECTED_EMAILS.has(user.email.trim().toLowerCase())
}

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

   const protectedUser = isProtectedUser(user)
   profileDeletePasswordInput.value = ''
   profileDeletePasswordInput.disabled = protectedUser
   profileDeleteBtn.disabled = protectedUser
   profileDeleteBtn.textContent = protectedUser ? 'Konto geschützt' : 'Konto löschen'

   if (profileDeleteNote) {
      profileDeleteNote.textContent = protectedUser
         ? 'Dieses Projektkonto ist dauerhaft vor Loeschung geschuetzt.'
         : 'Zum Löschen des Kontos ist dein Passwort erforderlich.'
   }
}

function setLoggedIn(user) {
   currentUser = user
   loginBtn.style.display   = 'none'
   navUser.style.display    = 'flex'
   navUsername.textContent  = user.username
   navAvatar.src = getAvatarUrl(user)
   updateProfileView(user)
   refreshProjectContacts()
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
   profileDeletePasswordInput.disabled = false
   profileUsername.textContent = ''
   profileDeleteBtn.textContent = 'Konto löschen'
   if (profileDeleteNote) {
      profileDeleteNote.textContent = 'Zum Löschen des Kontos ist dein Passwort erforderlich.'
   }
   refreshProjectContacts()
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
         showMsg('profile-message', data.error || 'Profilbild konnte nicht aktualisiert werden.', 'error')
      } else {
            showMsg('profile-message', data.message || 'Profilbild aktualisiert!', 'success')
         setLoggedIn(data.user)
      }
   } catch (_) {
         showMsg('profile-message', 'Server nicht erreichbar.', 'error')
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
      return showMsg('profile-message', 'Vollständiger Name und Benutzername sind erforderlich.', 'error')
   }

   profileSaveBtn.disabled = true
   profileSaveBtn.textContent = 'Speichern…'

   try {
      const res = await fetch('/api/auth/update-profile', {
         method: 'POST',
         credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ full_name, username })
      })
      const data = await res.json()

      if (!res.ok) {
         showMsg('profile-message', data.error || 'Profil konnte nicht aktualisiert werden.', 'error')
      } else {
         showMsg('profile-message', data.message || 'Profil aktualisiert!', 'success')
         setLoggedIn(data.user)
      }
   } catch (_) {
      showMsg('profile-message', 'Server nicht erreichbar.', 'error')
   } finally {
      profileSaveBtn.disabled = false
      profileSaveBtn.textContent = 'Änderungen speichern'
   }
})

profileDeleteBtn.addEventListener('click', async () => {
   if (!currentUser) return
   if (isProtectedUser(currentUser)) {
      return showMsg('profile-message', 'Dieses Projektkonto kann nicht gelöscht werden.', 'error')
   }

   const password = profileDeletePasswordInput.value
   if (!password) {
      return showMsg('profile-message', 'Bitte gib dein Passwort ein, um das Konto zu löschen.', 'error')
   }

   const confirmed = window.confirm('Möchtest du dein Konto wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.')
   if (!confirmed) return

   clearMsg('profile-message')
   profileDeleteBtn.disabled = true
   profileSaveBtn.disabled = true
   profileDeleteBtn.textContent = 'Löschen…'

   try {
      const res = await fetch('/api/auth/delete-account', {
         method: 'DELETE',
         credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ password })
      })
      const data = await res.json()

      if (!res.ok) {
         showMsg('profile-message', data.error || 'Konto konnte nicht gelöscht werden.', 'error')
      } else {
         setLoggedOut()
         showLogin()
         showMsg('login-message', data.message || 'Konto erfolgreich gelöscht.', 'success')
      }
   } catch (_) {
      showMsg('profile-message', 'Server nicht erreichbar.', 'error')
   } finally {
      profileDeleteBtn.disabled = false
      profileSaveBtn.disabled = false
      profileDeleteBtn.textContent = 'Konto löschen'
   }
})

staticModalTriggers.forEach((trigger) => {
   trigger.addEventListener('click', async (event) => {
      event.preventDefault()
      await refreshProjectContacts()
      showStaticModal(trigger.dataset.modalTarget)
   })
})

staticModalCloseButtons.forEach((button) => {
   button.addEventListener('click', () => {
      const modal = document.getElementById(button.dataset.modalClose)
      if (modal) {
         modal.classList.remove('show-login')
      }
   })
})

staticModalPanels.forEach((panel) => {
   panel.addEventListener('click', (event) => {
      if (event.target === panel) {
         panel.classList.remove('show-login')
      }
   })
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

   refreshProjectContacts()
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
   btn.textContent = 'Anmelden…'

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
      showMsg('login-message', 'Server nicht erreichbar. Läuft der Server?', 'error')
   } finally {
      btn.disabled = false
      btn.textContent = 'Anmelden'
   }
})

/*=============== REGISTER ===============*/
const sendCodeBtn   = document.getElementById('send-code-btn')
const emailCodeWrap = document.getElementById('email-code-wrap')
const regVerifyCode = document.getElementById('reg-verify-code')
let   sendCodeTimer = null

function getFriendlyRegisterError(errorMessage) {
   if (!errorMessage) return 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
   if (errorMessage.includes('already registered') || errorMessage.includes('bereits registriert')) return 'Für diese E-Mail existiert bereits ein Konto. Bitte melde dich an oder setze dein Passwort zurück.'
   if (errorMessage.includes('Invalid or expired verification code') || errorMessage.includes('ungültig') || errorMessage.includes('abgelaufen')) return 'Dein Code ist ungültig oder abgelaufen. Bitte klicke erneut auf „Code senden“.'
   return errorMessage
}

sendCodeBtn.addEventListener('click', async () => {
   const email = document.getElementById('reg-email').value.trim()
   if (!email) {
      return showMsg('register-message', 'Bitte gib zuerst deine E-Mail-Adresse ein.', 'error')
   }
   if (!/^[^\s@]+@tha\.de$/i.test(email)) {
      return showMsg('register-message', 'Nur @tha.de-E-Mail-Adressen sind erlaubt.', 'error')
   }

   clearMsg('register-message')
   sendCodeBtn.disabled = true
   sendCodeBtn.textContent = 'Senden…'

   const controller = new AbortController()
   const requestTimeout = window.setTimeout(() => controller.abort(), 20000)

   try {
      const res  = await fetch('/api/auth/send-verification', {
         method:      'POST',
         credentials: 'include',
         headers:     { 'Content-Type': 'application/json' },
         body:        JSON.stringify({ email }),
         signal:      controller.signal
      })
      const data = await res.json()

      if (!res.ok) {
         showMsg('register-message', getFriendlyRegisterError(data.error), 'error')
         sendCodeBtn.disabled = false
         sendCodeBtn.textContent = 'Code senden'
      } else {
         showMsg('register-message', data.message, 'success')
         emailCodeWrap.style.display = 'block'
         regVerifyCode.focus()
         if (sendCodeTimer) clearInterval(sendCodeTimer)
         let countdown = 60
         sendCodeBtn.textContent = `Erneut senden (${countdown}s)`
         sendCodeTimer = setInterval(() => {
            countdown--
            sendCodeBtn.textContent = `Erneut senden (${countdown}s)`
            if (countdown <= 0) {
               clearInterval(sendCodeTimer)
               sendCodeTimer = null
               sendCodeBtn.disabled = false
               sendCodeBtn.textContent = 'Code erneut senden'
            }
         }, 1000)
      }
   } catch (error) {
      const message = error?.name === 'AbortError'
         ? 'Das Senden des Codes hat zu lange gedauert. Bitte versuche es erneut.'
         : 'Server nicht erreichbar.'
      showMsg('register-message', message, 'error')
      sendCodeBtn.disabled = false
      sendCodeBtn.textContent = 'Code senden'
   } finally {
      window.clearTimeout(requestTimeout)
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
      return showMsg('register-message', 'Bitte fülle alle Felder aus.', 'error')
   }
   if (!verificationCode) {
      return showMsg('register-message', 'Bitte verifiziere zuerst deine E-Mail-Adresse – klicke auf „Code senden“.', 'error')
   }
   if (!/^[^\s@]+@tha\.de$/i.test(email)) {
      return showMsg('register-message', 'Nur @tha.de-E-Mail-Adressen sind erlaubt.', 'error')
   }
   if (password !== confirm_password) {
      return showMsg('register-message', 'Passwörter stimmen nicht überein.', 'error')
   }

   const btn = document.getElementById('register-submit')
   btn.disabled = true
   btn.textContent = 'Konto wird erstellt…'

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
         showMsg('register-message', getFriendlyRegisterError(data.error), 'error')
      } else {
         showMsg('register-message', data.message, 'success')
         setLoggedIn(data.user)
         setTimeout(() => { hideAll(); clearMsg('register-message') }, 800)
      }
   } catch (_) {
      showMsg('register-message', 'Server nicht erreichbar. Läuft der Server?', 'error')
   } finally {
      btn.disabled = false
      btn.textContent = 'Registrieren'
   }
})

/*=============== CHANGE USERNAME ===============*/
document.getElementById('change-username-form').addEventListener('submit', async (e) => {
   e.preventDefault()
   clearMsg('change-username-message')

   const newUsername = document.getElementById('new-username').value.trim()

   const btn = document.getElementById('change-username-submit')
   btn.disabled = true
   btn.textContent = 'Aktualisieren…'

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
      showMsg('change-username-message', 'Server nicht erreichbar.', 'error')
   } finally {
      btn.disabled = false
      btn.textContent = 'Benutzernamen aktualisieren'
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
      return showMsg('reset-password-message', 'Alle Felder sind erforderlich.', 'error')
   }

   if (newPassword !== confirmPassword) {
      return showMsg('reset-password-message', 'Passwörter stimmen nicht überein.', 'error')
   }

   const btn = document.getElementById('reset-password-submit')
   btn.disabled = true
   btn.textContent = 'Zurücksetzen…'

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
      showMsg('reset-password-message', 'Server nicht erreichbar.', 'error')
   } finally {
      btn.disabled = false
      btn.textContent = 'Passwort zurücksetzen'
   }
})




