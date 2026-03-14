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

const searchResults = document.getElementById('search-results')
let searchDebounceTimer = null

searchBtn.addEventListener('click',   () => search.classList.add('show-search'))
searchClose.addEventListener('click', () => {
   search.classList.remove('show-search')
   hideSearchResults()
})

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

function hideSearchResults() {
   searchResults.style.display = 'none'
   searchResults.innerHTML = ''
}

function createSearchGroup(title, users, formatter) {
   const group = document.createElement('section')
   group.className = 'search-results__group'

   const heading = document.createElement('h3')
   heading.className = 'search-results__title'
   heading.textContent = title
   group.appendChild(heading)

   const list = document.createElement('div')
   list.className = 'search-results__list'

   if (!Array.isArray(users) || !users.length) {
      const empty = document.createElement('p')
      empty.className = 'search-results__empty'
      empty.textContent = 'Keine Treffer'
      list.appendChild(empty)
   } else {
      users.forEach((user) => {
         const item = document.createElement('button')
         item.type = 'button'
         item.className = 'search-results__item'
         item.textContent = formatter(user)

         item.addEventListener('click', async () => {
            if (!user?.username) return
            hideSearchResults()
            search.classList.remove('show-search')
            await openPublicProfileByUsername(user.username)
         })

         list.appendChild(item)
      })
   }

   group.appendChild(list)
   return group
}

function renderSearchResults(payload) {
   const results = payload?.results || {}
   const displayNames = Array.isArray(results.displayNames) ? results.displayNames : []
   const usernames = Array.isArray(results.usernames) ? results.usernames : []
   const fullNames = Array.isArray(results.fullNames) ? results.fullNames : []

   searchResults.innerHTML = ''
   searchResults.appendChild(createSearchGroup('Anzeigename', displayNames, (user) => user.profile_name || '(kein Anzeigename)'))
   searchResults.appendChild(createSearchGroup('Username', usernames, (user) => '@' + user.username))
   searchResults.appendChild(createSearchGroup('Echter Name', fullNames, (user) => user.full_name))
   searchResults.style.display = 'block'
}

async function loadSearchResults(query) {
   const trimmedQuery = query.trim()
   if (!trimmedQuery) {
      hideSearchResults()
      return
   }

   try {
      const response = await fetch(`/api/auth/search-users?q=${encodeURIComponent(trimmedQuery)}`, {
         credentials: 'include'
      })

      if (!response.ok) {
         hideSearchResults()
         return
      }

      const data = await response.json()
      if (searchInput.value.trim() !== trimmedQuery) return
      renderSearchResults(data)
   } catch (_) {
      hideSearchResults()
   }
}

searchInput.addEventListener('input', () => {
   if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
   }

   searchDebounceTimer = setTimeout(() => {
      loadSearchResults(searchInput.value)
   }, 200)
})

/*=============== LOGIN / REGISTER TOGGLE ===============*/
const loginPanel      = document.getElementById('login'),
      registerPanel   = document.getElementById('register'),
      changeUsernamePanel = document.getElementById('change-username'),
      resetPasswordPanel = document.getElementById('reset-password'),
      profileModal    = document.getElementById('profile-modal'),
      accentColorModal = document.getElementById('accent-color-modal'),
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
      accentColorClose = document.getElementById('accent-color-close'),
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

const showLogin    = () => { hideStaticModals(); loginPanel.classList.add('show-login');       registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); accentColorModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); followListModal.classList.remove('show-login') }
const showRegister = () => { hideStaticModals(); registerPanel.classList.add('show-register'); loginPanel.classList.remove('show-login');    changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); accentColorModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); followListModal.classList.remove('show-login') }
const showResetPassword = () => { hideStaticModals(); resetPasswordPanel.classList.add('show-login'); loginPanel.classList.remove('show-login'); registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); accentColorModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); followListModal.classList.remove('show-login') }
const hideAll      = () => { loginPanel.classList.remove('show-login');    registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); accentColorModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); followListModal.classList.remove('show-login'); hideStaticModals() }

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
accentColorClose.addEventListener('click', () => accentColorModal.classList.remove('show-login'))
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
const profileDisplayName  = document.getElementById('profile-display-name')
const profileUsername     = document.getElementById('profile-username')
const profileShareLinkInput = document.getElementById('profile-share-link')
const profileShareCopyBtn = document.getElementById('profile-share-copy-btn')
const profileForm         = document.getElementById('profile-form')
const profileFullNameInput = document.getElementById('profile-full-name-input')
const profileDisplayNameInput = document.getElementById('profile-display-name-input')
const profileUsernameInput = document.getElementById('profile-username-input')
const profileAccentColorOpen = document.getElementById('profile-accent-color-open')
const profileAccentColorPreview = document.getElementById('profile-accent-color-preview')
const profileAccentColorValue = document.getElementById('profile-accent-color-value')
const profileAccentColorInput = document.getElementById('profile-accent-color-input')
const profileBackgroundInput = document.getElementById('profile-background-input')
const profileBackgroundPickBtn = document.getElementById('profile-background-pick-btn')
const profileBackgroundFilename = document.getElementById('profile-background-filename')
const profileBackgroundResetBtn = document.getElementById('profile-background-reset-btn')
const accentColorWheel = document.getElementById('accent-color-wheel')
const accentColorWheelIndicator = document.getElementById('accent-color-wheel-indicator')
const accentBrightnessInput = document.getElementById('accent-brightness')
const accentSaturationInput = document.getElementById('accent-saturation')
const accentHexInput = document.getElementById('accent-hex-input')
const accentApplyBtn = document.getElementById('accent-apply-btn')
const profileDeletePasswordInput = document.getElementById('profile-delete-password')
const profileDeleteNote = document.getElementById('profile-delete-note')
const profileSaveBtn       = document.getElementById('profile-save-btn')
const profileDeleteBtn     = document.getElementById('profile-delete-btn')
const publicProfileAvatar = document.getElementById('public-profile-avatar')
const publicProfileDisplayName = document.getElementById('public-profile-display-name')
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
const LOCAL_BACKGROUND_STORAGE_PREFIX = 'local-custom-bg:'
const LOCAL_BACKGROUND_MAX_DATA_URL_LENGTH = 36000000
const mainBackgroundImage = document.querySelector('.main__bg')
const DEFAULT_MAIN_BACKGROUND_SRC = mainBackgroundImage?.getAttribute('src') || 'assets/img/bg-image.png'

const messageTimers = new Map()

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=352C59&color=fff&name='
let currentUser = null
let isDraggingAccentWheel = false
let accentPickerState = {
   hue: 270,
   saturation: 35,
   lightness: 26
}
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

function hslToHex(h, s, l) {
   const hue = ((Number(h) % 360) + 360) % 360
   const saturation = Math.max(0, Math.min(100, Number(s))) / 100
   const lightness = Math.max(0, Math.min(100, Number(l))) / 100

   const c = (1 - Math.abs(2 * lightness - 1)) * saturation
   const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
   const m = lightness - c / 2

   let rPrime = 0
   let gPrime = 0
   let bPrime = 0

   if (hue < 60) {
      rPrime = c; gPrime = x; bPrime = 0
   } else if (hue < 120) {
      rPrime = x; gPrime = c; bPrime = 0
   } else if (hue < 180) {
      rPrime = 0; gPrime = c; bPrime = x
   } else if (hue < 240) {
      rPrime = 0; gPrime = x; bPrime = c
   } else if (hue < 300) {
      rPrime = x; gPrime = 0; bPrime = c
   } else {
      rPrime = c; gPrime = 0; bPrime = x
   }

   const r = Math.round((rPrime + m) * 255)
   const g = Math.round((gPrime + m) * 255)
   const b = Math.round((bPrime + m) * 255)

   return '#' + [r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function hexToHsl(hexColor) {
   const normalizedHex = normalizeHexColor(hexColor)
   if (!normalizedHex) return null

   const red = parseInt(normalizedHex.slice(1, 3), 16) / 255
   const green = parseInt(normalizedHex.slice(3, 5), 16) / 255
   const blue = parseInt(normalizedHex.slice(5, 7), 16) / 255

   const max = Math.max(red, green, blue)
   const min = Math.min(red, green, blue)
   const delta = max - min

   let hue = 0
   if (delta !== 0) {
      if (max === red) {
         hue = 60 * (((green - blue) / delta) % 6)
      } else if (max === green) {
         hue = 60 * ((blue - red) / delta + 2)
      } else {
         hue = 60 * ((red - green) / delta + 4)
      }
   }

   if (hue < 0) hue += 360

   const lightness = (max + min) / 2
   const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))

   return {
      hue,
      saturation: saturation * 100,
      lightness: lightness * 100
   }
}

function updateProfileAccentSummary(hexColor) {
   const normalizedHex = normalizeHexColor(hexColor) || getDefaultAccentColor()
   profileAccentColorInput.value = normalizedHex
   profileAccentColorPreview.style.backgroundColor = normalizedHex
   profileAccentColorValue.textContent = normalizedHex
}

function syncAccentPickerUi({ hexOverride = null } = {}) {
   const wheelRect = accentColorWheel.getBoundingClientRect()
   const radius = wheelRect.width / 2
   const distance = radius - 8
   const hueRadians = (accentPickerState.hue - 90) * (Math.PI / 180)
   const indicatorX = radius + Math.cos(hueRadians) * distance
   const indicatorY = radius + Math.sin(hueRadians) * distance

   accentColorWheelIndicator.style.left = `${indicatorX}px`
   accentColorWheelIndicator.style.top = `${indicatorY}px`

   accentColorWheel.setAttribute('aria-valuenow', String(Math.round(accentPickerState.hue)))
   accentColorWheel.style.filter = `saturate(${Math.max(0.15, accentPickerState.saturation / 100)}) brightness(${Math.max(0.15, accentPickerState.lightness / 50)})`

   accentBrightnessInput.value = String(Math.round(accentPickerState.lightness))
   accentSaturationInput.value = String(Math.round(accentPickerState.saturation))

   const hexColor = hexOverride || hslToHex(accentPickerState.hue, accentPickerState.saturation, accentPickerState.lightness)
   accentHexInput.value = hexColor
   accentColorModal.style.setProperty('--accent-picker-selected-color', hexColor)
}

function setAccentPickerFromHex(hexColor) {
   const normalizedHex = normalizeHexColor(hexColor) || getDefaultAccentColor()
   const hslColor = hexToHsl(normalizedHex)
   if (!hslColor) return

   accentPickerState = {
      hue: hslColor.hue,
      saturation: hslColor.saturation,
      lightness: hslColor.lightness
   }
   syncAccentPickerUi({ hexOverride: normalizedHex })
}

function setAccentHueFromClientPosition(clientX, clientY) {
   const wheelRect = accentColorWheel.getBoundingClientRect()
   const centerX = wheelRect.left + wheelRect.width / 2
   const centerY = wheelRect.top + wheelRect.height / 2
   const deltaX = clientX - centerX
   const deltaY = clientY - centerY

   let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
   angle = (angle + 90 + 360) % 360

   accentPickerState.hue = angle
   syncAccentPickerUi()
}

function openAccentColorModal() {
   setAccentPickerFromHex(profileAccentColorInput.value)
   accentColorModal.classList.add('show-login')
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

function getProfileDisplayName(user) {
   if (!user || typeof user.profile_name !== 'string') return ''
   return user.profile_name.trim()
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

function getBackgroundStorageKey(user) {
   const username = user?.username?.trim().toLowerCase()
   if (!username) return null
   return `${LOCAL_BACKGROUND_STORAGE_PREFIX}${username}`
}

function applyMainBackground(source) {
   if (!mainBackgroundImage) return
   mainBackgroundImage.src = source || DEFAULT_MAIN_BACKGROUND_SRC
}

function getStoredBackgroundForUser(user) {
   const storageKey = getBackgroundStorageKey(user)
   if (!storageKey) return null

   try {
      const storedValue = localStorage.getItem(storageKey)
      if (typeof storedValue === 'string' && storedValue.startsWith('data:image/')) {
         return storedValue
      }
   } catch (_) {
      return null
   }

   return null
}

function saveBackgroundForCurrentUser(dataUrl) {
   const storageKey = getBackgroundStorageKey(currentUser)
   if (!storageKey) return false

   try {
      localStorage.setItem(storageKey, dataUrl)
      return true
   } catch (_) {
      return false
   }
}

function clearBackgroundForCurrentUser() {
   const storageKey = getBackgroundStorageKey(currentUser)
   if (!storageKey) return false

   try {
      localStorage.removeItem(storageKey)
      return true
   } catch (_) {
      return false
   }
}

function applyStoredBackgroundForUser(user) {
   const storedBackground = getStoredBackgroundForUser(user)
   applyMainBackground(storedBackground)
}

function updateBackgroundControls(user) {
   if (!profileBackgroundResetBtn) return

   const hasCustomBackground = Boolean(getStoredBackgroundForUser(user))
   profileBackgroundResetBtn.disabled = !hasCustomBackground
   profileBackgroundResetBtn.textContent = hasCustomBackground
      ? 'Hintergrund zurücksetzen'
      : 'Kein eigener Hintergrund'
}

   function setBackgroundFilenameLabel(fileName = '') {
      if (!profileBackgroundFilename) return
      profileBackgroundFilename.textContent = fileName || 'Kein Bild ausgewählt'
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
   const publicDisplayName = getProfileDisplayName(user)
   publicProfileDisplayName.textContent = publicDisplayName
   publicProfileDisplayName.style.display = publicDisplayName ? 'block' : 'none'
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
   publicProfileDisplayName.textContent = ''
   publicProfileDisplayName.style.display = 'none'
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
      const userAccentColor = normalizeHexColor(user?.accent_color)
      if (userAccentColor) {
         avatar.style.borderColor = userAccentColor
      }

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
   profileDisplayNameInput.value = getProfileDisplayName(user)
   profileUsernameInput.value = user.username
   updateProfileAccentSummary(normalizeHexColor(user?.accent_color) || getDefaultAccentColor())
   updateBackgroundControls(user)
   const displayName = getProfileDisplayName(user)
   profileDisplayName.textContent = displayName
   profileDisplayName.style.display = displayName ? 'block' : 'none'
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
   applyStoredBackgroundForUser(user)
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
   applyMainBackground(null)
   loginBtn.style.display  = ''
   navUser.style.display   = 'none'
   navAvatar.src           = ''
   navUsername.textContent = ''
   profileAvatarImage.src  = ''
   profileFullNameInput.value = ''
   profileDisplayNameInput.value = ''
   profileUsernameInput.value = ''
   updateProfileAccentSummary(getDefaultAccentColor())
   profileDeletePasswordInput.value = ''
   profileDeletePasswordInput.disabled = false
   profileDisplayName.textContent = ''
   profileDisplayName.style.display = 'none'
   profileUsername.textContent = ''
   profileShareLinkInput.value = ''
   if (profileBackgroundInput) {
      profileBackgroundInput.value = ''
   }
   setBackgroundFilenameLabel('')
   updateBackgroundControls(null)
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
profileAccentColorOpen.addEventListener('click', openAccentColorModal)

accentColorModal.addEventListener('click', (event) => {
   if (event.target === accentColorModal) {
      accentColorModal.classList.remove('show-login')
   }
})

accentColorWheel.addEventListener('mousedown', (event) => {
   isDraggingAccentWheel = true
   setAccentHueFromClientPosition(event.clientX, event.clientY)
})

window.addEventListener('mousemove', (event) => {
   if (!isDraggingAccentWheel) return
   setAccentHueFromClientPosition(event.clientX, event.clientY)
})

window.addEventListener('mouseup', () => {
   isDraggingAccentWheel = false
})

accentColorWheel.addEventListener('keydown', (event) => {
   if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
   event.preventDefault()
   const direction = event.key === 'ArrowRight' ? 1 : -1
   accentPickerState.hue = (accentPickerState.hue + direction + 360) % 360
   syncAccentPickerUi()
})

accentBrightnessInput.addEventListener('input', () => {
   accentPickerState.lightness = Number(accentBrightnessInput.value)
   syncAccentPickerUi()
})

accentSaturationInput.addEventListener('input', () => {
   accentPickerState.saturation = Number(accentSaturationInput.value)
   syncAccentPickerUi()
})

accentHexInput.addEventListener('input', () => {
   const parsedColor = normalizeHexColor(accentHexInput.value)
   if (!parsedColor) return
   setAccentPickerFromHex(parsedColor)
})

accentApplyBtn.addEventListener('click', () => {
   const selectedColor = normalizeHexColor(accentHexInput.value)
   if (!selectedColor) {
      return showMsg('profile-message', 'Bitte gib einen gültigen Hexcode ein.', 'error')
   }

   clearMsg('profile-message')
   updateProfileAccentSummary(selectedColor)
   accentColorModal.classList.remove('show-login')
})

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

profileBackgroundPickBtn.addEventListener('click', () => {
   if (!currentUser) {
      return showMsg('profile-message', 'Bitte melde dich an, um einen lokalen Hintergrund zu verwenden.', 'error')
   }

   clearMsg('profile-message')
   profileBackgroundInput.click()
})

profileBackgroundInput.addEventListener('change', () => {
   const backgroundFile = profileBackgroundInput.files[0]
   if (!backgroundFile) return
   setBackgroundFilenameLabel(backgroundFile.name)

   if (!currentUser) {
      profileBackgroundInput.value = ''
      setBackgroundFilenameLabel('')
      return showMsg('profile-message', 'Bitte melde dich an, um einen lokalen Hintergrund zu verwenden.', 'error')
   }

   if (!backgroundFile.type.startsWith('image/')) {
      profileBackgroundInput.value = ''
      setBackgroundFilenameLabel('')
      return showMsg('profile-message', 'Bitte wähle eine Bilddatei aus.', 'error')
   }

   if (backgroundFile.size > 25 * 1024 * 1024) {
      profileBackgroundInput.value = ''
      setBackgroundFilenameLabel('')
      return showMsg('profile-message', 'Bild ist zu groß (max. 25 MB).', 'error')
   }

   clearMsg('profile-message')
   profileBackgroundInput.disabled = true
   profileBackgroundPickBtn.disabled = true
   profileBackgroundResetBtn.disabled = true

   const reader = new FileReader()
   reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''

      if (!dataUrl.startsWith('data:image/')) {
         showMsg('profile-message', 'Ungültiges Bildformat.', 'error')
      } else if (dataUrl.length > LOCAL_BACKGROUND_MAX_DATA_URL_LENGTH) {
         showMsg('profile-message', 'Bild ist zu groß für die lokale Speicherung.', 'error')
      } else if (!saveBackgroundForCurrentUser(dataUrl)) {
         showMsg('profile-message', 'Lokaler Speicher voll oder blockiert. Bitte kleineres Bild wählen.', 'error')
      } else {
         applyMainBackground(dataUrl)
         updateBackgroundControls(currentUser)
         showMsg('profile-message', 'Lokaler Hintergrund gespeichert.', 'success')
      }

      profileBackgroundInput.value = ''
      profileBackgroundInput.disabled = false
      profileBackgroundPickBtn.disabled = false
      profileBackgroundResetBtn.disabled = false
   }

   reader.onerror = () => {
      showMsg('profile-message', 'Bild konnte nicht gelesen werden.', 'error')
      profileBackgroundInput.value = ''
      setBackgroundFilenameLabel('')
      profileBackgroundInput.disabled = false
      profileBackgroundPickBtn.disabled = false
      profileBackgroundResetBtn.disabled = false
   }

   reader.readAsDataURL(backgroundFile)
})

profileBackgroundResetBtn.addEventListener('click', () => {
   if (!currentUser) return

   const removed = clearBackgroundForCurrentUser()
   if (!removed) {
      return showMsg('profile-message', 'Lokaler Hintergrund konnte nicht entfernt werden.', 'error')
   }

   applyMainBackground(null)
   setBackgroundFilenameLabel('')
   updateBackgroundControls(currentUser)
   showMsg('profile-message', 'Lokaler Hintergrund entfernt.', 'success')
})

profileUsernameInput.addEventListener('input', () => {
   const value = profileUsernameInput.value.trim()
   profileUsername.textContent = value ? '@' + value : '@'
})

profileDisplayNameInput.addEventListener('input', () => {
   const value = profileDisplayNameInput.value.trim()
   profileDisplayName.textContent = value
   profileDisplayName.style.display = value ? 'block' : 'none'
})

profileForm.addEventListener('submit', async (e) => {
   e.preventDefault()
   clearMsg('profile-message')

   const full_name = profileFullNameInput.value.trim()
   const profile_name = profileDisplayNameInput.value
   const trimmedProfileName = typeof profile_name === 'string' ? profile_name.trim() : ''
   const username  = profileUsernameInput.value.trim()
   const accent_color = normalizeHexColor(profileAccentColorInput.value)

   if (!full_name || !username) {
      return showMsg('profile-message', 'Vollständiger Name und Benutzername sind erforderlich.', 'error')
   }

   if (trimmedProfileName.length > 20) {
      return showMsg('profile-message', 'Der Profilname darf maximal 20 Zeichen lang sein.', 'error')
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
         body: JSON.stringify({ full_name, profile_name, username, accent_color })
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




