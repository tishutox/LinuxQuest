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
      publicProfileModal = document.getElementById('public-profile-modal'),
   followListModal = document.getElementById('follow-list-modal'),
      loginBtn        = document.getElementById('login-btn'),
      loginClose      = document.getElementById('login-close'),
      registerClose   = document.getElementById('register-close'),
      signupLink      = document.getElementById('signup-link'),
      loginLink       = document.getElementById('login-link'),
      forgotPasswordLink = document.getElementById('forgot-password-link'),
      resetPasswordClose = document.getElementById('reset-password-close'),
      backToLoginLink = document.getElementById('back-to-login-link'),
      profileClose    = document.getElementById('profile-close'),
      publicProfileClose = document.getElementById('public-profile-close'),
      followListClose = document.getElementById('follow-list-close')

const staticModalTriggers = document.querySelectorAll('[data-modal-target]')
const staticModalCloseButtons = document.querySelectorAll('[data-modal-close]')
const staticModalPanels = Array.from(document.querySelectorAll('.info-modal'))
const imprintArmandLink = document.getElementById('imprint-armand-link')
const imprintJostLink = document.getElementById('imprint-jost-link')

const projectContactConfig = {
   armand: {
      fallback: {
         full_name: 'Armand Patrick Asztalos',
         username: 'armand',
         email: 'armand.patrick.asztalos@tha.de'
      },
      imprintLink: imprintArmandLink
   },
   jost: {
      fallback: {
         full_name: 'Jost Witthauer',
         username: 'jost',
         email: 'jost.witthauer@tha.de'
      },
      imprintLink: imprintJostLink
   }
}

function hideStaticModals() {
   staticModalPanels.forEach((panel) => panel.classList.remove('show-login'))
}

const showLogin    = () => { hideStaticModals(); loginPanel.classList.add('show-login');       registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); followListModal.classList.remove('show-login') }
const showRegister = () => { hideStaticModals(); registerPanel.classList.add('show-register'); loginPanel.classList.remove('show-login');    changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); followListModal.classList.remove('show-login') }
const showResetPassword = () => { hideStaticModals(); resetPasswordPanel.classList.add('show-login'); loginPanel.classList.remove('show-login'); registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); followListModal.classList.remove('show-login') }
const hideAll      = () => { loginPanel.classList.remove('show-login');    registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); followListModal.classList.remove('show-login'); hideStaticModals() }

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
forgotPasswordLink.addEventListener('click', (e) => {
   e.preventDefault()
   showResetPassword()
   resetEmailCodeWrap.style.display = 'none'
   resetVerifyCode.value = ''
   sendResetCodeBtn.disabled = false
   sendResetCodeBtn.textContent = 'Code senden'
   if (sendResetCodeTimer) { clearInterval(sendResetCodeTimer); sendResetCodeTimer = null }
   clearMsg('reset-password-message')
})
resetPasswordClose.addEventListener('click', hideAll)
backToLoginLink.addEventListener('click', (e) => {
   e.preventDefault()
   showLogin()
   if (sendResetCodeTimer) { clearInterval(sendResetCodeTimer); sendResetCodeTimer = null }
   sendResetCodeBtn.disabled = false
   sendResetCodeBtn.textContent = 'Code senden'
})
profileClose.addEventListener('click', hideAll)
publicProfileClose.addEventListener('click', hideAll)
followListClose.addEventListener('click', hideAll)

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
   if (messageTimers.has(id)) {
      clearTimeout(messageTimers.get(id))
      messageTimers.delete(id)
   }
   el.textContent = text
   el.className = 'login__message ' + type

   if (type === 'success') {
      const timer = setTimeout(() => {
         clearMsg(id)
      }, 3000)
      messageTimers.set(id, timer)
   }
}
function clearMsg(id) {
   const el = document.getElementById(id)
   if (messageTimers.has(id)) {
      clearTimeout(messageTimers.get(id))
      messageTimers.delete(id)
   }
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
const profileShareLinkInput = document.getElementById('profile-share-link')
const profileShareCopyBtn = document.getElementById('profile-share-copy-btn')
const profileForm         = document.getElementById('profile-form')
const profileFullNameInput = document.getElementById('profile-full-name-input')
const profileUsernameInput = document.getElementById('profile-username-input')
const profileAccentColorInput = document.getElementById('profile-accent-color-input')
const profileDeletePasswordInput = document.getElementById('profile-delete-password')
const profileDeleteNote = document.getElementById('profile-delete-note')
const profileSaveBtn       = document.getElementById('profile-save-btn')
const profileDeleteBtn     = document.getElementById('profile-delete-btn')
const publicProfileAvatar = document.getElementById('public-profile-avatar')
const publicProfileUsername = document.getElementById('public-profile-username')
const publicProfileMessage = document.getElementById('public-profile-message')
const publicProfileCopyBtn = document.getElementById('public-profile-copy-btn')
const publicProfileEmailLink = document.getElementById('public-profile-email-link')
const publicProfileFollowingBadge = document.getElementById('public-profile-following-badge')
const publicProfileFollowersCount = document.getElementById('public-profile-followers-count')
const publicProfileFollowingCount = document.getElementById('public-profile-following-count')
const publicProfileFollowersTrigger = document.getElementById('public-profile-followers-trigger')
const publicProfileFollowingTrigger = document.getElementById('public-profile-following-trigger')
const publicProfileFollowBtn = document.getElementById('public-profile-follow-btn')
const followListTitle = document.getElementById('follow-list-title')
const followListMessage = document.getElementById('follow-list-message')
const followListContainer = document.getElementById('follow-list-container')

const PROTECTED_EMAILS = new Set([
   'armand.patrick.asztalos@tha.de',
   'jost.witthauer@tha.de'
])

const projectContactsByKey = {
   armand: null,
   jost: null
}

const PROJECT_CONTACTS_CACHE_MS = 15000
let projectContactsLastLoadedAt = 0
let projectContactsRefreshPromise = null
const USER_THEME_CLASS = 'user-theme-active'

const messageTimers = new Map()

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=352C59&color=fff&name='
let currentUser = null
let currentPublicProfileUser = null
let currentPublicProfileFollowState = {
   followersCount: 0,
   followingCount: 0,
   isFollowing: false,
   isOwnProfile: false,
   canFollow: false
}

function getDisplayUser(contact, fallback) {
   return contact || fallback
}

function setImprintContactLink(link, contact, fallback) {
   if (!link) return

   const displayUser = getDisplayUser(contact, fallback)
   link.textContent = `${displayUser.full_name}, ${displayUser.email}`
}

function updateProjectContactModal(contactKey, contact) {
   const config = projectContactConfig[contactKey]
   if (!config) return

   const displayUser = getDisplayUser(contact, config.fallback)
   projectContactsByKey[contactKey] = displayUser

   setImprintContactLink(config.imprintLink, contact, config.fallback)
}

async function refreshProjectContacts({ force = false } = {}) {
   const now = Date.now()
   const hasFreshCache = projectContactsLastLoadedAt > 0 && (now - projectContactsLastLoadedAt) < PROJECT_CONTACTS_CACHE_MS

   if (!force && hasFreshCache) {
      return
   }

   if (projectContactsRefreshPromise) {
      return projectContactsRefreshPromise
   }

   projectContactsRefreshPromise = (async () => {
      try {
         const response = await fetch('/api/auth/project-contacts', { credentials: 'include' })
         if (!response.ok) throw new Error('Kontakte konnten nicht geladen werden')

         const data = await response.json()
         updateProjectContactModal('armand', data.contacts?.armand || null)
         updateProjectContactModal('jost', data.contacts?.jost || null)
         projectContactsLastLoadedAt = Date.now()
      } catch (_) {
         if (!projectContactsLastLoadedAt) {
            updateProjectContactModal('armand', null)
            updateProjectContactModal('jost', null)
         }
      } finally {
         projectContactsRefreshPromise = null
      }
   })()

   return projectContactsRefreshPromise
}

function isProtectedUser(user) {
   return Boolean(user?.email) && PROTECTED_EMAILS.has(user.email.trim().toLowerCase())
}

function getDefaultAccentColor() {
   const cssValue = getComputedStyle(document.documentElement).getPropertyValue('--first-color').trim()
   if (/^#[0-9A-Fa-f]{6}$/.test(cssValue)) return cssValue.toUpperCase()
   return '#352C59'
}

function normalizeHexColor(value) {
   if (typeof value !== 'string') return null
   const trimmed = value.trim()
   return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed.toUpperCase() : null
}

function applyUserAccentColor(accentColor) {
   const normalizedAccentColor = normalizeHexColor(accentColor)
   if (!normalizedAccentColor) {
      document.body.classList.remove(USER_THEME_CLASS)
      document.documentElement.style.setProperty('--user-accent-color', getDefaultAccentColor())
      return
   }

   document.body.classList.add(USER_THEME_CLASS)
   document.documentElement.style.setProperty('--user-accent-color', normalizedAccentColor)
}

function applyPublicProfileAccentColor(accentColor) {
   const normalizedAccentColor = normalizeHexColor(accentColor) || getDefaultAccentColor()
   publicProfileModal.style.setProperty('--public-profile-accent-color', normalizedAccentColor)
}

function getAvatarUrl(user) {
   return user.avatar
      ? '/' + user.avatar
      : DEFAULT_AVATAR + encodeURIComponent(user.full_name)
}

function buildProfilePath(username) {
   return `/@${encodeURIComponent(username)}`
}

function buildProfileUrl(username) {
   return `${window.location.origin}${buildProfilePath(username)}`
}

function getSharedUsernameFromPath() {
   const match = window.location.pathname.match(/^\/@([a-zA-Z0-9_-]+)$/)
   return match ? decodeURIComponent(match[1]) : null
}

function updateProfileShareLink(username) {
   if (!profileShareLinkInput) return
   profileShareLinkInput.value = buildProfileUrl(username)
}

function updateFollowButton() {
   if (!publicProfileFollowBtn) return

   const { canFollow, isFollowing, isOwnProfile } = currentPublicProfileFollowState

   if (isOwnProfile || !canFollow) {
      publicProfileFollowBtn.style.display = 'none'
      publicProfileFollowBtn.disabled = false
      publicProfileFollowBtn.textContent = 'Folgen'
      if (publicProfileFollowingBadge) {
         publicProfileFollowingBadge.style.display = 'none'
      }
      return
   }

   publicProfileFollowBtn.style.display = 'block'
   publicProfileFollowBtn.disabled = false
   publicProfileFollowBtn.textContent = isFollowing ? 'Entfolgen' : 'Folgen'

   if (publicProfileFollowingBadge) {
      publicProfileFollowingBadge.style.display = isFollowing ? 'inline-flex' : 'none'
   }
}

function updatePublicFollowStats() {
   publicProfileFollowersCount.textContent = String(currentPublicProfileFollowState.followersCount || 0)
   publicProfileFollowingCount.textContent = String(currentPublicProfileFollowState.followingCount || 0)
}

function updatePublicProfileView(payload) {
   const user = payload?.user || payload
   const follow = payload?.follow || {}

   if (publicProfileMessage) {
      publicProfileMessage.textContent = ''
      publicProfileMessage.className = 'login__message'
   }

   currentPublicProfileUser = user
   applyPublicProfileAccentColor(user?.accent_color)
   currentPublicProfileFollowState = {
      followersCount: follow.followersCount || 0,
      followingCount: follow.followingCount || 0,
      isFollowing: Boolean(follow.isFollowing),
      isOwnProfile: Boolean(follow.isOwnProfile),
      canFollow: Boolean(follow.canFollow)
   }

   publicProfileAvatar.src = getAvatarUrl(user)
   publicProfileUsername.textContent = '@' + user.username
   updatePublicFollowStats()
   updateFollowButton()

   const normalizedEmail = user.email ? user.email.trim().toLowerCase() : ''
   const showEmailAction = PROTECTED_EMAILS.has(normalizedEmail)

   publicProfileEmailLink.style.display = showEmailAction ? 'inline-flex' : 'none'
   publicProfileEmailLink.href = showEmailAction ? `mailto:${user.email}` : '#'
}

function showPublicProfileError(message) {
   if (publicProfileMessage) {
      publicProfileMessage.textContent = message
      publicProfileMessage.className = 'login__message error'
   }

   currentPublicProfileUser = null
   applyPublicProfileAccentColor(null)
   currentPublicProfileFollowState = {
      followersCount: 0,
      followingCount: 0,
      isFollowing: false,
      isOwnProfile: false,
      canFollow: false
   }
   publicProfileAvatar.src = DEFAULT_AVATAR + encodeURIComponent('Unbekannt')
   publicProfileUsername.textContent = '@unbekannt'
    updatePublicFollowStats()
    updateFollowButton()
   publicProfileEmailLink.style.display = 'none'
   publicProfileEmailLink.href = '#'
   hideAll()
   publicProfileModal.classList.add('show-login')
}

function showPublicProfileNotice(message, type = 'success', autoHideMs = 3000) {
   if (!publicProfileMessage) return

   if (messageTimers.has('public-profile-message')) {
      clearTimeout(messageTimers.get('public-profile-message'))
      messageTimers.delete('public-profile-message')
   }

   publicProfileMessage.textContent = message
   publicProfileMessage.className = `login__message ${type}`

   if (autoHideMs > 0) {
      const timer = setTimeout(() => {
         if (publicProfileMessage.classList.contains('error')) return
         publicProfileMessage.textContent = ''
         publicProfileMessage.className = 'login__message'
      }, autoHideMs)

      messageTimers.set('public-profile-message', timer)
   }
}

async function openPublicProfileByUsername(username) {
   if (!username) return

   try {
      const response = await fetch(`/api/auth/public/${encodeURIComponent(username)}`, {
         credentials: 'include'
      })

      if (!response.ok) {
         if (response.status === 404) {
            showPublicProfileError('Dieses Profil wurde nicht gefunden.')
            return
         }

         showPublicProfileError('Das Profil konnte gerade nicht geladen werden.')
         return
      }

      const data = await response.json()
      if (!data.user) {
         showPublicProfileError('Dieses Profil wurde nicht gefunden.')
         return
      }

      updatePublicProfileView(data)
      hideAll()
      publicProfileModal.classList.add('show-login')
   } catch (_) {
      showPublicProfileError('Der Server ist nicht erreichbar. Bitte versuche es später erneut.')
   }
}

function renderFollowList(users) {
   followListContainer.innerHTML = ''

   if (!users.length) {
      const empty = document.createElement('p')
      empty.className = 'follow-list__empty'
      empty.textContent = 'Keine Profile vorhanden.'
      followListContainer.appendChild(empty)
      return
   }

   users.forEach((user) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'follow-list__item'

      const avatar = document.createElement('img')
      avatar.className = 'follow-list__avatar'
      avatar.src = getAvatarUrl(user)
      avatar.alt = `Profilbild von ${user.username}`

      const username = document.createElement('span')
      username.className = 'follow-list__username'
      username.textContent = '@' + user.username

      button.appendChild(avatar)
      button.appendChild(username)

      button.addEventListener('click', async () => {
         await openPublicProfileByUsername(user.username)
      })

      followListContainer.appendChild(button)
   })
}

async function openFollowList(type) {
   const username = currentPublicProfileUser?.username
   if (!username) return

   followListTitle.textContent = type === 'followers' ? 'Follower' : 'Gefolgt'
   followListContainer.innerHTML = ''
   clearMsg('follow-list-message')

   const loading = document.createElement('p')
   loading.className = 'follow-list__empty'
   loading.textContent = 'Lade…'
   followListContainer.appendChild(loading)

   hideAll()
   followListModal.classList.add('show-login')

   try {
      const response = await fetch(`/api/auth/public/${encodeURIComponent(username)}/${type}`, {
         credentials: 'include'
      })

      const data = await response.json()
      if (!response.ok) {
         showMsg('follow-list-message', data.error || 'Liste konnte nicht geladen werden.', 'error')
         followListContainer.innerHTML = ''
         return
      }

      renderFollowList(Array.isArray(data.users) ? data.users : [])
   } catch (_) {
      showMsg('follow-list-message', 'Server nicht erreichbar.', 'error')
      followListContainer.innerHTML = ''
   }
}

function updateProfileView(user) {
   profileAvatarImage.src  = getAvatarUrl(user)
   profileFullNameInput.value = user.full_name
   profileUsernameInput.value = user.username
   profileAccentColorInput.value = normalizeHexColor(user?.accent_color) || getDefaultAccentColor()
   profileUsername.textContent = '@' + user.username
   updateProfileShareLink(user.username)

   const protectedUser = isProtectedUser(user)
   profileDeletePasswordInput.value = ''
   profileDeletePasswordInput.disabled = protectedUser
   profileDeleteBtn.disabled = protectedUser
   profileDeleteBtn.textContent = protectedUser ? 'Konto geschützt' : 'Konto löschen'

   if (profileDeleteNote) {
      profileDeleteNote.textContent = protectedUser
         ? 'Dieses Projektkonto ist dauerhaft vor Löschung geschützt.'
         : 'Zum Löschen des Kontos ist dein Passwort erforderlich.'
   }
}

function setLoggedIn(user) {
   currentUser = user
   applyUserAccentColor(user?.accent_color)
   loginBtn.style.display   = 'none'
   navUser.style.display    = 'flex'
   navUsername.textContent  = user.username
   navAvatar.src = getAvatarUrl(user)
   updateProfileView(user)
   refreshProjectContacts()
}

function setLoggedOut() {
   currentUser = null
   applyUserAccentColor(null)
   loginBtn.style.display  = ''
   navUser.style.display   = 'none'
   navAvatar.src           = ''
   navUsername.textContent = ''
   profileAvatarImage.src  = ''
   profileFullNameInput.value = ''
   profileUsernameInput.value = ''
   profileAccentColorInput.value = getDefaultAccentColor()
   profileDeletePasswordInput.value = ''
   profileDeletePasswordInput.disabled = false
   profileUsername.textContent = ''
   profileShareLinkInput.value = ''
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

profileShareCopyBtn.addEventListener('click', async () => {
   if (!profileShareLinkInput.value) return

   try {
      await navigator.clipboard.writeText(profileShareLinkInput.value)
      showMsg('profile-message', 'Profil-Link kopiert!', 'success')
   } catch (_) {
      showMsg('profile-message', 'Link konnte nicht kopiert werden. Bitte manuell kopieren.', 'error')
   }
})

publicProfileCopyBtn.addEventListener('click', async () => {
   if (!currentPublicProfileUser?.username) return

   try {
      await navigator.clipboard.writeText(buildProfileUrl(currentPublicProfileUser.username))
      showPublicProfileNotice('Profil-Link kopiert!', 'success', 3000)
   } catch (_) {
      showPublicProfileNotice('Link konnte nicht kopiert werden. Bitte manuell kopieren.', 'error', 4000)
   }
})

publicProfileFollowBtn.addEventListener('click', async () => {
   if (!currentPublicProfileUser?.username) return

   const username = currentPublicProfileUser.username
   const willFollow = !currentPublicProfileFollowState.isFollowing

   if (!currentUser) {
      showPublicProfileNotice('Bitte melde dich an, um Profile zu folgen.', 'error', 4000)
      return
   }

   publicProfileFollowBtn.disabled = true

   try {
      const response = await fetch(`/api/auth/follow/${encodeURIComponent(username)}`, {
         method: willFollow ? 'POST' : 'DELETE',
         credentials: 'include'
      })

      const data = await response.json()
      if (!response.ok) {
         showPublicProfileNotice(data.error || 'Aktion konnte nicht ausgeführt werden.', 'error', 4000)
      } else {
         showPublicProfileNotice(data.message || (willFollow ? 'Gefolgt.' : 'Entfolgt.'), 'success', 2500)
         await openPublicProfileByUsername(username)
      }
   } catch (_) {
      showPublicProfileNotice('Server nicht erreichbar.', 'error', 4000)
   } finally {
      publicProfileFollowBtn.disabled = false
   }
})

publicProfileFollowersTrigger.addEventListener('click', async () => {
   await openFollowList('followers')
})

publicProfileFollowingTrigger.addEventListener('click', async () => {
   await openFollowList('following')
})

async function openSharedProfileFromUrl() {
   const sharedUsername = getSharedUsernameFromPath()
   if (!sharedUsername) return

   await openPublicProfileByUsername(sharedUsername)
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
   const accent_color = normalizeHexColor(profileAccentColorInput.value)

   if (!full_name || !username) {
      return showMsg('profile-message', 'Vollständiger Name und Benutzername sind erforderlich.', 'error')
   }

    if (!accent_color) {
      return showMsg('profile-message', 'Bitte wähle eine gültige Profilfarbe.', 'error')
   }

   profileSaveBtn.disabled = true
   profileSaveBtn.textContent = 'Speichern…'

   try {
      const res = await fetch('/api/auth/update-profile', {
         method: 'POST',
         credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ full_name, username, accent_color })
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

      const publicProfileKey = trigger.dataset.publicProfile
      if (publicProfileKey) {
         await refreshProjectContacts()
         const displayUser = projectContactsByKey[publicProfileKey]

         if (!displayUser?.username) {
            showPublicProfileError('Dieses Profil wurde nicht gefunden.')
            return
         }

         await openPublicProfileByUsername(displayUser.username)
         return
      }

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
   await openSharedProfileFromUrl()
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
const sendResetCodeBtn   = document.getElementById('send-reset-code-btn')
const resetEmailCodeWrap = document.getElementById('reset-email-code-wrap')
const resetVerifyCode    = document.getElementById('reset-verify-code')
let   sendResetCodeTimer = null

function getFriendlyRegisterError(errorMessage) {
   if (!errorMessage) return 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
   if (errorMessage.includes('already registered') || errorMessage.includes('bereits registriert')) return 'Für diese E-Mail existiert bereits ein Konto. Bitte melde dich an oder setze dein Passwort zurück.'
   if (errorMessage.includes('Invalid or expired verification code') || errorMessage.includes('ungültig') || errorMessage.includes('abgelaufen')) return 'Dein Code ist ungültig oder abgelaufen. Bitte klicke erneut auf „Code senden“.'
   return errorMessage
}

function getFriendlyResetError(errorMessage) {
   if (!errorMessage) return 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
   if (errorMessage.includes('Benutzer nicht gefunden')) return 'Für diese E-Mail oder diesen Benutzernamen wurde kein Konto gefunden.'
   if (errorMessage.includes('ungültig') || errorMessage.includes('abgelaufen')) return 'Dein Code ist ungültig oder abgelaufen. Bitte fordere einen neuen an.'
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

sendResetCodeBtn.addEventListener('click', async () => {
   const identifier = document.getElementById('reset-identifier').value.trim()
   if (!identifier) {
      return showMsg('reset-password-message', 'Bitte gib zuerst deine E-Mail-Adresse oder deinen Benutzernamen ein.', 'error')
   }

   clearMsg('reset-password-message')
   sendResetCodeBtn.disabled = true
   sendResetCodeBtn.textContent = 'Senden…'

   const controller = new AbortController()
   const requestTimeout = window.setTimeout(() => controller.abort(), 20000)

   try {
      const res  = await fetch('/api/auth/send-password-reset-verification', {
         method:      'POST',
         credentials: 'include',
         headers:     { 'Content-Type': 'application/json' },
         body:        JSON.stringify({ identifier }),
         signal:      controller.signal
      })
      const data = await res.json()

      if (!res.ok) {
         showMsg('reset-password-message', getFriendlyResetError(data.error), 'error')
         sendResetCodeBtn.disabled = false
         sendResetCodeBtn.textContent = 'Code senden'
      } else {
         showMsg('reset-password-message', data.message, 'success')
         resetEmailCodeWrap.style.display = 'block'
         resetVerifyCode.focus()

         if (sendResetCodeTimer) clearInterval(sendResetCodeTimer)
         let countdown = 60
         sendResetCodeBtn.textContent = `Erneut senden (${countdown}s)`
         sendResetCodeTimer = setInterval(() => {
            countdown--
            sendResetCodeBtn.textContent = `Erneut senden (${countdown}s)`
            if (countdown <= 0) {
               clearInterval(sendResetCodeTimer)
               sendResetCodeTimer = null
               sendResetCodeBtn.disabled = false
               sendResetCodeBtn.textContent = 'Code erneut senden'
            }
         }, 1000)
      }
   } catch (error) {
      const message = error?.name === 'AbortError'
         ? 'Das Senden des Codes hat zu lange gedauert. Bitte versuche es erneut.'
         : 'Server nicht erreichbar.'
      showMsg('reset-password-message', message, 'error')
      sendResetCodeBtn.disabled = false
      sendResetCodeBtn.textContent = 'Code senden'
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
   const verificationCode = resetVerifyCode.value.trim()
   const newPassword      = document.getElementById('reset-new-password').value
   const confirmPassword  = document.getElementById('reset-confirm-password').value

   // Client-side validation
   if (!identifier || !verificationCode || !newPassword || !confirmPassword) {
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
         body:        JSON.stringify({ identifier, verificationCode, newPassword, confirmPassword })
      })
      const data = await res.json()

      if (!res.ok) {
         showMsg('reset-password-message', getFriendlyResetError(data.error), 'error')
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




