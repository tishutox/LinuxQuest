/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById('nav-menu'),
      navToggle = document.getElementById('nav-toggle'),
      navClose = document.getElementById('nav-close')

navToggle.addEventListener('click', () => navMenu.classList.add('show-menu'))
navClose.addEventListener('click',  () => navMenu.classList.remove('show-menu'))

/*=============== APP INSTALL (NO POPUP) ===============*/
const installAppBtn = document.getElementById('install-app-btn')
let deferredInstallPrompt = null

window.addEventListener('beforeinstallprompt', (event) => {
   event.preventDefault()
   deferredInstallPrompt = event
   if (installAppBtn) installAppBtn.style.display = 'inline-flex'
})

installAppBtn?.addEventListener('click', async () => {
   if (!deferredInstallPrompt) {
      return
   }

   deferredInstallPrompt.prompt()
   await deferredInstallPrompt.userChoice
   deferredInstallPrompt = null
   installAppBtn.style.display = 'none'
})

window.addEventListener('appinstalled', () => {
   deferredInstallPrompt = null
   if (installAppBtn) installAppBtn.style.display = 'none'
})

if ('serviceWorker' in navigator) {
   window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
         registration.update().catch(() => {})
      }).catch((error) => {
         console.error('[SERVICE WORKER REGISTRATION ERROR]', error)
      })

      navigator.serviceWorker.addEventListener('controllerchange', () => {
         window.location.reload()
      })
   })
}

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

   searchResults.innerHTML = ''
   searchResults.appendChild(createSearchGroup('Anzeigename', displayNames, (user) => user.profile_name || '(kein Anzeigename)'))
   searchResults.appendChild(createSearchGroup('Username', usernames, (user) => '@' + user.username))
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
      birthDateModal = document.getElementById('birth-date-modal'),
      beliefModal = document.getElementById('belief-modal'),
      publicProfileModal = document.getElementById('public-profile-modal'),
      reportModal = document.getElementById('report-modal'),
      bugReportModal = document.getElementById('bug-report-modal'),
      adminReportsModal = document.getElementById('admin-reports-modal'),
   followListModal = document.getElementById('follow-list-modal'),
   adminUserListModal = document.getElementById('admin-user-list-modal'),
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
      birthDateClose = document.getElementById('birth-date-close'),
      beliefClose = document.getElementById('belief-close'),
      publicProfileClose = document.getElementById('public-profile-close'),
      reportClose = document.getElementById('report-close'),
      bugReportClose = document.getElementById('bug-report-close'),
      unbanRequestModal = document.getElementById('unban-request-modal'),
      unbanRequestClose = document.getElementById('unban-request-close'),
      adminReportsClose = document.getElementById('admin-reports-close'),
      followListClose = document.getElementById('follow-list-close'),
      adminUserListClose = document.getElementById('admin-user-list-close')

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

const showLogin    = () => { hideStaticModals(); loginPanel.classList.add('show-login');       registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); accentColorModal.classList.remove('show-login'); birthDateModal.classList.remove('show-login'); beliefModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); reportModal.classList.remove('show-login'); bugReportModal.classList.remove('show-login'); adminReportsModal.classList.remove('show-login'); followListModal.classList.remove('show-login'); adminUserListModal.classList.remove('show-search') }
const showRegister = () => { hideStaticModals(); registerPanel.classList.add('show-register'); loginPanel.classList.remove('show-login');    changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); accentColorModal.classList.remove('show-login'); birthDateModal.classList.remove('show-login'); beliefModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); reportModal.classList.remove('show-login'); bugReportModal.classList.remove('show-login'); adminReportsModal.classList.remove('show-login'); followListModal.classList.remove('show-login'); adminUserListModal.classList.remove('show-search') }
const showResetPassword = () => { hideStaticModals(); resetPasswordPanel.classList.add('show-login'); loginPanel.classList.remove('show-login'); registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); accentColorModal.classList.remove('show-login'); birthDateModal.classList.remove('show-login'); beliefModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); reportModal.classList.remove('show-login'); bugReportModal.classList.remove('show-login'); adminReportsModal.classList.remove('show-login'); followListModal.classList.remove('show-login'); adminUserListModal.classList.remove('show-search') }
const hideAll      = () => { loginPanel.classList.remove('show-login');    registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); accentColorModal.classList.remove('show-login'); birthDateModal.classList.remove('show-login'); beliefModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); reportModal.classList.remove('show-login'); bugReportModal.classList.remove('show-login'); adminReportsModal.classList.remove('show-login'); followListModal.classList.remove('show-login'); adminUserListModal.classList.remove('show-search'); hideStaticModals() }

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
birthDateClose.addEventListener('click', () => birthDateModal.classList.remove('show-login'))
beliefClose.addEventListener('click', () => beliefModal.classList.remove('show-login'))
publicProfileClose.addEventListener('click', hideAll)
reportClose.addEventListener('click', hideAll)
bugReportClose.addEventListener('click', hideAll)
unbanRequestClose.addEventListener('click', hideAll)
adminReportsClose.addEventListener('click', hideAll)
followListClose.addEventListener('click', hideAll)
adminUserListClose.addEventListener('click', hideAll)

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
const profilePronounsInput = document.getElementById('profile-pronouns-input')
const profilePronounsCounter = document.getElementById('profile-pronouns-counter')
const profileDisplayNameCounter = document.getElementById('profile-display-name-counter')
const profileUsernameCounter = document.getElementById('profile-username-counter')
const profileBioInput = document.getElementById('profile-bio-input')
const profileBioCounter = document.getElementById('profile-bio-counter')
const profileBirthDateOpen = document.getElementById('profile-birth-date-open')
const profileBirthDateValue = document.getElementById('profile-birth-date-value')
const profileBirthDateInput = document.getElementById('profile-birth-date-input')
const birthDatePrevMonthBtn = document.getElementById('birth-date-prev-month')
const birthDateNextMonthBtn = document.getElementById('birth-date-next-month')
const birthDateCurrentMonth = document.getElementById('birth-date-current-month')
const birthDateYearInput = document.getElementById('birth-date-year-input')
const birthDateCalendarGrid = document.getElementById('birth-date-calendar-grid')
const birthDateClearBtn = document.getElementById('birth-date-clear-btn')
const birthDateApplyBtn = document.getElementById('birth-date-apply-btn')
const profileBeliefOpen = document.getElementById('profile-belief-open')
const profileBeliefValue = document.getElementById('profile-belief-value')
const profileConfessionValue = document.getElementById('profile-confession-value')
const profileBeliefInput = document.getElementById('profile-belief-input')
const profileConfessionInput = document.getElementById('profile-confession-input')
const beliefPickerReligions = document.getElementById('belief-picker-religions')
const beliefPickerConfession = document.getElementById('belief-picker-confession')
const beliefApplyBtn = document.getElementById('belief-apply-btn')
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
const publicProfileNameRow = document.getElementById('public-profile-name-row')
const publicProfileDisplayName = document.getElementById('public-profile-display-name')
const publicProfilePronouns = document.getElementById('public-profile-pronouns')
const publicProfileUsername = document.getElementById('public-profile-username')
const publicProfileMessage = document.getElementById('public-profile-message')
const publicProfileCopyBtn = document.getElementById('public-profile-copy-btn')
const publicProfileZodiac = document.getElementById('public-profile-zodiac')
const publicProfileBelief = document.getElementById('public-profile-belief')
const publicProfileEarlySupporter = document.getElementById('public-profile-early-supporter')
const publicProfileEmailLink = document.getElementById('public-profile-email-link')
const publicProfileFollowersCount = document.getElementById('public-profile-followers-count')
const publicProfileFollowingCount = document.getElementById('public-profile-following-count')
const publicProfileFollowersTrigger = document.getElementById('public-profile-followers-trigger')
const publicProfileFollowingTrigger = document.getElementById('public-profile-following-trigger')
const publicProfileFollowIconBtn = document.getElementById('public-profile-follow-icon-btn')
const publicProfileBioBox = document.getElementById('public-profile-bio-box')
const publicProfileBioText = document.getElementById('public-profile-bio-text')
const publicProfileReportBtn = document.getElementById('public-profile-report-btn')
const reportReasonInput = document.getElementById('report-reason-input')
const reportReasonCounter = document.getElementById('report-reason-counter')
const reportSubmitBtn = document.getElementById('report-submit-btn')
const reportCancelBtn = document.getElementById('report-cancel-btn')
const reportMessage = document.getElementById('report-message')
const bugReportReasonInput = document.getElementById('bug-report-reason-input')
const bugReportReasonCounter = document.getElementById('bug-report-reason-counter')
const bugReportSubmitBtn = document.getElementById('bug-report-submit-btn')
const bugReportCancelBtn = document.getElementById('bug-report-cancel-btn')
const bugReportMessage = document.getElementById('bug-report-message')
const unbanRequestReasonInput = document.getElementById('unban-request-reason-input')
const unbanRequestReasonCounter = document.getElementById('unban-request-reason-counter')
const unbanRequestSubmitBtn = document.getElementById('unban-request-submit-btn')
const unbanRequestCancelBtn = document.getElementById('unban-request-cancel-btn')
const unbanRequestMessage = document.getElementById('unban-request-message')
const adminReportsMessage = document.getElementById('admin-reports-message')
const adminReportsList = document.getElementById('admin-reports-list')
const adminReportsTabMeldungen = document.getElementById('admin-reports-tab-meldungen')
const adminReportsTabBugs = document.getElementById('admin-reports-tab-bugs')
const adminReportsTabEntbannungen = document.getElementById('admin-reports-tab-entbannungen')
const adminReportsTabUsers = document.getElementById('admin-reports-tab-users')
const adminBugReportsList = document.getElementById('admin-bug-reports-list')
const adminUnbanRequestsList = document.getElementById('admin-unban-requests-list')
const adminUsersList = document.getElementById('admin-users-list')
const adminReportsSearch = document.getElementById('admin-reports-search')
const followListTitle = document.getElementById('follow-list-title')
const followListMessage = document.getElementById('follow-list-message')
const followListContainer = document.getElementById('follow-list-container')
const adminUserListSearch = document.getElementById('admin-user-list-search')
const adminUserListMessage = document.getElementById('admin-user-list-message')
const adminUserListResults = document.getElementById('admin-user-list-results')
const adminUserListForm = document.getElementById('admin-user-list-form')

const PROTECTED_EMAILS = new Set([
   'armand.patrick.asztalos@tha.de'
])

const USER_ROLES = Object.freeze({
   USER: 'user',
   MODERATOR: 'moderator',
   ADMINISTRATOR: 'administrator'
})

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

function setAdminReportsTab(tab = 'meldungen') {
   const showUnbanTab = tab === 'entbannungen'

   if (adminReportsList) {
      adminReportsList.style.display = showUnbanTab ? 'none' : 'block'
   }
   if (adminUnbanRequestsList) {
      adminUnbanRequestsList.style.display = showUnbanTab ? 'block' : 'none'
   }

   if (adminReportsTabMeldungen && adminReportsTabEntbannungen) {
      adminReportsTabMeldungen.style.color = showUnbanTab ? 'var(--text-color)' : 'var(--title-color)'
      adminReportsTabMeldungen.style.borderBottomColor = showUnbanTab ? 'transparent' : 'var(--first-color)'
      adminReportsTabEntbannungen.style.color = showUnbanTab ? 'var(--title-color)' : 'var(--text-color)'
      adminReportsTabEntbannungen.style.borderBottomColor = showUnbanTab ? 'var(--first-color)' : 'transparent'
   }
}

async function openAdminReports(username, initialTab = 'meldungen') {
   if (!username) return

   clearMsg('admin-reports-message')
   adminReportsTitle.textContent = `Tickets für @${username}`
   adminReportsList.innerHTML = ''
   adminUnbanRequestsList.innerHTML = ''
   setAdminReportsTab(initialTab)

   hideAll()
   adminReportsModal.classList.add('show-login')

   try {
      const response = await fetch(`/api/auth/admin/reports/${encodeURIComponent(username)}`, {
         credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
         showMsg('admin-reports-message', data.error || 'Meldungen konnten nicht geladen werden.', 'error')
         return
      }

      const reports = Array.isArray(data.reports) ? data.reports : []
      const viewerIsAdministrator = isAdminUser(currentUser)
      if (!reports.length) {
         adminReportsList.innerHTML = '<p class="admin-reports__empty">Keine Meldungen vorhanden.</p>'
      } else {
      reports.forEach((report) => {
         const isClosed = report.closed === 1

         const item = document.createElement('div')
         item.className = 'admin-reports__item' + (isClosed ? ' admin-reports__item--closed' : '')

         const itemHeader = document.createElement('div')
         itemHeader.className = 'admin-reports__item-header'

         const reporter = document.createElement('button')
         reporter.type = 'button'
         reporter.className = 'admin-reports__reporter admin-reports__reporter-button'
         const reporterName = report.reporter_full_name ? `${report.reporter_full_name} (@${report.reporter_username || 'unbekannt'})` : `@${report.reporter_username || 'unbekannt'}`
         reporter.textContent = reporterName

         if (report.reporter_username) {
            reporter.addEventListener('click', async () => {
               await openPublicProfileByUsername(report.reporter_username)
            })
         } else {
            reporter.disabled = true
         }

         if (isClosed) {
            const closedBadge = document.createElement('span')
            closedBadge.className = 'admin-reports__closed-badge'
            closedBadge.textContent = 'Geschlossen'
            itemHeader.appendChild(closedBadge)
         }

         itemHeader.appendChild(reporter)

         const reason = document.createElement('div')
         reason.className = 'admin-reports__reason'
         reason.textContent = report.reason || 'Kein Grund angegeben.'

         const date = document.createElement('div')
         date.className = 'admin-reports__date'
         const createdAt = report.created_at ? new Date(report.created_at) : null
         date.textContent = createdAt && !Number.isNaN(createdAt.getTime())
            ? createdAt.toLocaleString('de-DE')
            : 'Zeit unbekannt'

         item.appendChild(itemHeader)
         item.appendChild(reason)
         item.appendChild(date)

         if (!isClosed && viewerIsAdministrator) {
            const closeBtn = document.createElement('button')
            closeBtn.type = 'button'
            closeBtn.className = 'admin-reports__close-btn'
            closeBtn.textContent = 'Fall schließen'
            closeBtn.addEventListener('click', async () => {
               closeBtn.disabled = true
               closeBtn.textContent = 'Schließt…'
               try {
                  const closeResp = await fetch(`/api/auth/admin/reports/${report.id}/close`, {
                     method: 'PATCH',
                     credentials: 'include'
                  })
                  const closeData = await closeResp.json()
                  if (!closeResp.ok) {
                     showMsg('admin-reports-message', closeData.error || 'Fall konnte nicht geschlossen werden.', 'error')
                     closeBtn.disabled = false
                     closeBtn.textContent = 'Fall schließen'
                  } else {
                     await openAdminReports(username)
                  }
               } catch (_) {
                  showMsg('admin-reports-message', 'Server nicht erreichbar.', 'error')
                  closeBtn.disabled = false
                  closeBtn.textContent = 'Fall schließen'
               }
            })
            item.appendChild(closeBtn)
         }

         adminReportsList.appendChild(item)
      })
      }
   } catch (_) {
      showMsg('admin-reports-message', 'Server nicht erreichbar.', 'error')
   }

   // Load unban requests
   try {
      const unbanResp = await fetch('/api/auth/admin/unban-requests', {
         credentials: 'include'
      })
      const unbanData = await unbanResp.json()

      if (!unbanResp.ok) {
         adminUnbanRequestsList.innerHTML = '<p class="admin-reports__empty">Keine Freigabeanfragen geladen.</p>'
         return
      }

      const requests = Array.isArray(unbanData.requests) ? unbanData.requests : []
      const viewerIsAdministrator = isAdminUser(currentUser)
      if (!requests.length) {
         adminUnbanRequestsList.innerHTML = '<p class="admin-reports__empty">Keine Freigabeanfragen vorhanden.</p>'
         return
      }

      requests.forEach((request) => {
         const item = document.createElement('div')
         item.className = 'admin-reports__item'

         const itemHeader = document.createElement('div')
         itemHeader.className = 'admin-reports__item-header'

         const userBtn = document.createElement('button')
         userBtn.type = 'button'
         userBtn.className = 'admin-reports__reporter admin-reports__reporter-button'
         const userName = request.full_name ? `${request.full_name} (@${request.username || 'unbekannt'})` : `@${request.username || 'unbekannt'}`
         userBtn.textContent = userName

         if (request.username) {
            userBtn.addEventListener('click', async () => {
               await openPublicProfileByUsername(request.username)
            })
         } else {
            userBtn.disabled = true
         }

         itemHeader.appendChild(userBtn)

         const reason = document.createElement('div')
         reason.className = 'admin-reports__reason'
         reason.textContent = request.reason || 'Kein Grund angegeben.'

         const date = document.createElement('div')
         date.className = 'admin-reports__date'
         const createdAt = request.createdAt ? new Date(request.createdAt) : null
         date.textContent = createdAt && !Number.isNaN(createdAt.getTime())
            ? createdAt.toLocaleString('de-DE')
            : 'Zeit unbekannt'

         item.appendChild(itemHeader)
         item.appendChild(reason)
         item.appendChild(date)

         if (viewerIsAdministrator) {
            const approveBtn = document.createElement('button')
            approveBtn.type = 'button'
            approveBtn.className = 'admin-reports__close-btn'
            approveBtn.textContent = 'Freigeben'
            approveBtn.addEventListener('click', async () => {
               approveBtn.disabled = true
               approveBtn.textContent = 'Wird freigegeben…'
               try {
                  const approveResp = await fetch(`/api/auth/admin/unban-requests/${request.id}/resolve`, {
                     method: 'PATCH',
                     credentials: 'include'
                  })
                  const approveData = await approveResp.json()
                  if (!approveResp.ok) {
                     showMsg('admin-reports-message', approveData.error || 'Anfrage konnte nicht genehmigt werden.', 'error')
                     approveBtn.disabled = false
                     approveBtn.textContent = 'Freigeben'
                  } else {
                     showMsg('admin-reports-message', approveData.message || 'Anfrage genehmigt.', 'success')
                     await openAdminReports(username)
                  }
               } catch (_) {
                  showMsg('admin-reports-message', 'Server nicht erreichbar.', 'error')
                  approveBtn.disabled = false
                  approveBtn.textContent = 'Freigeben'
               }
            })
            item.appendChild(approveBtn)
         }

         adminUnbanRequestsList.appendChild(item)
      })
   } catch (_) {
      showMsg('admin-reports-message', 'Server nicht erreichbar.', 'error')
   }
}

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=352C59&color=fff&name='
let currentUser = null
let restrictionCheckInterval = null
let isDraggingAccentWheel = false
let accentPickerState = {
   hue: 270,
   saturation: 35,
   lightness: 26
}
let birthDatePickerView = {
   month: new Date().getMonth() + 1,
   year: new Date().getFullYear(),
   selectedDate: ''
}

const BIRTH_DATE_MIN_YEAR = 1900
const BIRTH_DATE_MAX_YEAR = 2100
let beliefPickerState = {
   belief: '',
   confession: ''
}

/*=============== BUG REPORT MODAL ===============*/
const navLogo = document.querySelector('.nav__logo')
navLogo.addEventListener('click', (e) => {
   e.preventDefault()
   if (!currentUser) {
      showMsg('bug-report-message', 'Bitte melde dich an, um einen Bug zu melden.', 'error')
      return
   }
   hideAll()
   bugReportReasonInput.value = ''
   bugReportReasonCounter.textContent = '0/1000'
   clearMsg('bug-report-message')
   bugReportModal.classList.add('show-login')
})

bugReportReasonInput.addEventListener('input', () => {
   bugReportReasonCounter.textContent = `${bugReportReasonInput.value.length}/1000`
})

bugReportCancelBtn.addEventListener('click', hideAll)

bugReportSubmitBtn.addEventListener('click', async () => {
   const description = bugReportReasonInput.value.trim()
   
   if (!description) {
      showMsg('bug-report-message', 'Bitte beschreibe den Bug.', 'error')
      return
   }

   bugReportSubmitBtn.disabled = true
   bugReportSubmitBtn.textContent = 'Wird gesendet...'

   try {
      const response = await fetch('/api/auth/report-bug', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ description })
      })

      const data = await response.json()

      if (!response.ok) {
         showMsg('bug-report-message', data.error || 'Bug konnte nicht gemeldet werden.', 'error')
         bugReportSubmitBtn.disabled = false
         bugReportSubmitBtn.textContent = 'Bug melden'
         return
      }

      showMsg('bug-report-message', 'Bug erfolgreich gemeldet! Danke für die Rückmeldung.', 'success')
      setTimeout(() => {
         hideAll()
         bugReportReasonInput.value = ''
         bugReportReasonCounter.textContent = '0/1000'
         bugReportSubmitBtn.disabled = false
         bugReportSubmitBtn.textContent = 'Bug melden'
      }, 2000)
   } catch (err) {
      showMsg('bug-report-message', 'Serverfehler. Bitte versuche es später erneut.', 'error')
      bugReportSubmitBtn.disabled = false
      bugReportSubmitBtn.textContent = 'Bug melden'
   }
})

/*=============== ADMIN PANEL – BUG REPORTS ===============*/
async function loadAdminBugReports() {
   try {
      const response = await fetch('/api/auth/admin/bug-reports')
      if (!response.ok) {
         showMsg('admin-reports-message', 'Bug Reports konnten nicht geladen werden.', 'error')
         return
      }

      const data = await response.json()
      adminBugReportsList.innerHTML = ''

      if (!data.reports || data.reports.length === 0) {
         adminBugReportsList.innerHTML = '<p style="text-align: center; color: var(--text-color); padding: 1rem;">Keine offenen Bug Reports</p>'
         return
      }

      data.reports.forEach((report) => {
         const item = document.createElement('div')
         item.style.cssText = 'margin-bottom: 1rem; padding: 1rem; background: var(--bg-container); border-radius: .5rem; border: 1px solid var(--border-color);'
         
         const createdAt = new Date(report.created_at).toLocaleDateString('de-DE')
         const statusText = report.closed ? '✓ Geschlossen' : 'Offen'
         const statusColor = report.closed ? 'var(--first-color)' : 'var(--text-color)'
         
         item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: .5rem;">
               <div>
                  <p style="margin: 0; font-weight: bold; color: var(--title-color);">${report.username || 'Unbekannt'}</p>
                  <p style="margin: .25rem 0; font-size: .85rem; color: var(--text-color);">${createdAt}</p>
               </div>
               <span style="font-size: .75rem; color: ${statusColor}; font-weight: bold;">${statusText}</span>
            </div>
            <p style="margin: .5rem 0; white-space: pre-wrap; word-break: break-word; color: var(--text-color); max-height: 150px; overflow-y: auto;">${report.description}</p>
         `

         if (!report.closed) {
            const closeBtn = document.createElement('button')
            closeBtn.type = 'button'
            closeBtn.className = 'login__button'
            closeBtn.style.cssText = 'width: 100%; margin-top: .5rem; font-size: .85rem; padding: .4rem;'
            closeBtn.textContent = 'Abhaken'
            closeBtn.addEventListener('click', async () => {
               closeBtn.disabled = true
               closeBtn.textContent = 'Wird gespeichert...'

               try {
                  const response = await fetch(`/api/auth/admin/bug-reports/${report.id}/close`, {
                     method: 'PATCH'
                  })

                  if (response.ok) {
                     loadAdminBugReports()
                  } else {
                     showMsg('admin-reports-message', 'Bug Report konnte nicht geschlossen werden.', 'error')
                     closeBtn.disabled = false
                     closeBtn.textContent = 'Abhaken'
                  }
               } catch (err) {
                  showMsg('admin-reports-message', 'Server nicht erreichbar.', 'error')
                  closeBtn.disabled = false
                  closeBtn.textContent = 'Abhaken'
               }
            })
            item.appendChild(closeBtn)
         }

         adminBugReportsList.appendChild(item)
      })
   } catch (_) {
      showMsg('admin-reports-message', 'Serverfehler beim Laden der Bug Reports.', 'error')
   }
}

// Admin reports tab handling
// Admin reports category handling
if (adminReportsTabBugs && adminReportsTabEntbannungen && adminReportsTabMeldungen && adminReportsTabUsers) {
   // Hide all lists initially
   const hideAllAdminLists = () => {
      adminReportsList.style.display = 'none'
      adminBugReportsList.style.display = 'none'
      adminUnbanRequestsList.style.display = 'none'
      adminUsersList.style.display = 'none'
   }

   // Remove active class from all buttons
   const removeAllActive = () => {
      adminReportsTabBugs.classList.remove('active')
      adminReportsTabEntbannungen.classList.remove('active')
      adminReportsTabMeldungen.classList.remove('active')
      adminReportsTabUsers.classList.remove('active')
   }

   // Bugs category
   adminReportsTabBugs.addEventListener('click', () => {
      removeAllActive()
      hideAllAdminLists()
      adminReportsTabBugs.classList.add('active')
      adminBugReportsList.style.display = 'block'
      loadAdminBugReports()
   })

   // Freigaben category
   adminReportsTabEntbannungen.addEventListener('click', () => {
      removeAllActive()
      hideAllAdminLists()
      adminReportsTabEntbannungen.classList.add('active')
      adminUnbanRequestsList.style.display = 'block'
      loadAdminUnbanRequests()
   })

   // Meldungen category
   adminReportsTabMeldungen.addEventListener('click', () => {
      removeAllActive()
      hideAllAdminLists()
      adminReportsTabMeldungen.classList.add('active')
      adminReportsList.style.display = 'block'
      loadAdminReports()
   })

   // Nutzernamen category
   adminReportsTabUsers.addEventListener('click', () => {
      removeAllActive()
      hideAllAdminLists()
      adminReportsTabUsers.classList.add('active')
      adminUsersList.style.display = 'block'
   })

   // Search functionality for users
   if (adminReportsSearch) {
      adminReportsSearch.addEventListener('input', (e) => {
         const query = e.target.value.trim()
         
         // Only show users list when searching in Users tab
         if (adminReportsTabUsers.classList.contains('active')) {
            if (!query) {
               adminUsersList.innerHTML = ''
               return
            }

            fetch(`/api/auth/admin/users?q=${encodeURIComponent(query)}`)
               .then(res => res.json())
               .then(data => {
                  adminUsersList.innerHTML = ''
                  if (!data.users || data.users.length === 0) {
                     adminUsersList.innerHTML = '<p style="text-align: center; color: var(--text-color); padding: 1rem;">Keine Nutzer gefunden</p>'
                     return
                  }

                  data.users.forEach(user => {
                     const item = document.createElement('div')
                     item.style.cssText = 'padding: 1rem; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background .3s;'
                     item.innerHTML = `
                        <div style="display: flex; align-items: center; gap: .5rem;">
                           <img src="${user.avatar ? '/' + user.avatar : 'assets/img/default-avatar.png'}" alt="" style="width: 2rem; height: 2rem; border-radius: 50%; object-fit: cover;">
                           <div>
                              <p style="margin: 0; font-weight: bold; color: var(--title-color);">@${user.username}</p>
                              <p style="margin: 0; font-size: .85rem; color: var(--text-color);">${user.full_name}</p>
                           </div>
                        </div>
                     `
                     item.addEventListener('mouseenter', () => {
                        item.style.background = 'var(--bg-container)'
                     })
                     item.addEventListener('mouseleave', () => {
                        item.style.background = 'transparent'
                     })
                     adminUsersList.appendChild(item)
                  })
               })
               .catch(err => {
                  showMsg('admin-reports-message', 'Fehler beim Laden der Nutzer.', 'error')
               })
         }
      })
   }
}

let currentPublicProfileUser = null
let adminUserListDebounceTimer = null
let activePublicProfileTooltip = null
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

function normalizeUserRole(value) {
   if (typeof value !== 'string') return USER_ROLES.USER
   const normalized = value.trim().toLowerCase()
   if (normalized === USER_ROLES.ADMINISTRATOR) return USER_ROLES.ADMINISTRATOR
   if (normalized === USER_ROLES.MODERATOR) return USER_ROLES.MODERATOR
   return USER_ROLES.USER
}

function getUserRole(user) {
   if (!user) return USER_ROLES.USER
   if (isProtectedUser(user)) return USER_ROLES.ADMINISTRATOR
   return normalizeUserRole(user.role)
}

function isAdminUser(user) {
   return getUserRole(user) === USER_ROLES.ADMINISTRATOR
}

function canAccessAdminPanel(user) {
   const role = getUserRole(user)
   return role === USER_ROLES.ADMINISTRATOR || role === USER_ROLES.MODERATOR
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

function getAccentTextColor(hexColor) {
   const normalizedHex = normalizeHexColor(hexColor)
   if (!normalizedHex) return '#FFF'

   const red = parseInt(normalizedHex.slice(1, 3), 16)
   const green = parseInt(normalizedHex.slice(3, 5), 16)
   const blue = parseInt(normalizedHex.slice(5, 7), 16)
   const perceivedBrightness = (red * 299 + green * 587 + blue * 114) / 1000

   return perceivedBrightness >= 186 ? '#000' : '#FFF'
}

function parseBirthDate(value) {
   if (typeof value !== 'string') return null
   const trimmed = value.trim()
   const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
   if (!match) return null

   const day = Number(match[1])
   const month = Number(match[2])
   const year = Number(match[3])

   if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null
   if (year < 1900 || year > 2100) return null
   if (month < 1 || month > 12) return null

   const maxDay = new Date(year, month, 0).getDate()
   if (day < 1 || day > maxDay) return null

   return { day, month, year, normalized: `${match[1]}/${match[2]}/${match[3]}` }
}

function normalizePronouns(value) {
   if (typeof value !== 'string') return ''
   return value.replace(/\s+/g, ' ').trim()
}

function normalizeBio(value) {
   if (typeof value !== 'string') return ''
   return value.replace(/\r\n?/g, '\n').trim()
}

function updateCounter(el, value, max) {
   if (!el) return
   const len = typeof value === 'string' ? value.length : 0
   el.textContent = `${len}/${max}`
   el.classList.remove('profile__input-counter--warn', 'profile__input-counter--danger')
   if (len >= Math.ceil(max * 2 / 3)) {
      el.classList.add('profile__input-counter--danger')
   } else if (len >= Math.ceil(max / 3)) {
      el.classList.add('profile__input-counter--warn')
   }
}

function updatePronounsCounter(value = '') {
   updateCounter(profilePronounsCounter, value, 30)
}

function updateBioCounter(value = '') {
   updateCounter(profileBioCounter, value, 200)
}

function updateDisplayNameCounter(value = '') {
   updateCounter(profileDisplayNameCounter, value, 20)
}

function updateUsernameCounter(value = '') {
   updateCounter(profileUsernameCounter, value, 20)
}

function getZodiacSignByBirthDate(value) {
   const parsed = parseBirthDate(value)
   if (!parsed) return null

   const monthDay = parsed.month * 100 + parsed.day

   if (monthDay >= 120 && monthDay <= 218) return { name: 'Wassermann', iconClass: 'fi fi-rc-water' }
   if (monthDay >= 219 && monthDay <= 320) return { name: 'Fische', iconClass: 'fi fi-rc-fish' }
   if (monthDay >= 321 && monthDay <= 419) return { name: 'Widder', iconClass: 'fi fi-rc-ram' }
   if (monthDay >= 420 && monthDay <= 520) return { name: 'Stier', iconClass: 'fi fi-rc-skull-cow' }
   if (monthDay >= 521 && monthDay <= 620) return { name: 'Zwillinge', iconClass: 'fi fi-rr-mirror-user' }
   if (monthDay >= 621 && monthDay <= 722) return { name: 'Krebs', iconClass: 'fi fi-rc-crab' }
   if (monthDay >= 723 && monthDay <= 822) return { name: 'Löwe', iconClass: 'fi fi-rc-lion-head' }
   if (monthDay >= 823 && monthDay <= 922) return { name: 'Jungfrau', iconClass: 'fi fi-rc-angel' }
   if (monthDay >= 923 && monthDay <= 1022) return { name: 'Waage', iconClass: 'fi fi-rr-equality' }
   if (monthDay >= 1023 && monthDay <= 1121) return { name: 'Skorpion', iconClass: 'fi fi-rr-scorpion' }
   if (monthDay >= 1122 && monthDay <= 1221) return { name: 'Schütze', iconClass: 'fi fi-rc-bow-arrow' }

   return { name: 'Steinbock', iconClass: 'fi fi-rc-sheep' }
}

const BELIEF_INFO_BY_VALUE = {
   Atheismus: {
      value: 'Atheismus',
      iconClass: 'fi fi-rc-physics'
   },
   Christentum: {
      value: 'Christentum',
      iconClass: 'fi fi-rc-cross-religion'
   },
   Islam: {
      value: 'Islam',
      iconClass: 'fi fi-rc-star-and-crescent'
   },
   Judentum: {
      value: 'Judentum',
      iconClass: 'fi fi-rc-star-of-david'
   },
   Hinduismus: {
      value: 'Hinduismus',
      iconClass: 'fi fi-rc-om'
   },
   Buddhismus: {
      value: 'Buddhismus',
      iconClass: 'fi fi-rr-dharmachakra'
   },
   Daoismus: {
      value: 'Daoismus',
      iconClass: 'fi fi-rc-yin-yang'
   },
   Shintoismus: {
      value: 'Shintoismus',
      iconClass: 'fi fi-rc-torii-gate'
   }
}

const CONFESSIONS_BY_BELIEF = {
   Atheismus: ['Agnostizismus', 'Säkularer Humanismus', 'Freidenkertum', 'Keine Konfession'],
   Christentum: ['Katholizismus', 'Evangelisch', 'Orthodoxie', 'Freikirchlich', 'Keine Konfession'],
   Islam: ['Sunnitentum', 'Schiitentum', 'Alevitentum', 'Ahmadiyya', 'Keine Konfession'],
   Judentum: ['Orthodox', 'Konservativ', 'Reformiert', 'Liberal', 'Keine Konfession'],
   Hinduismus: ['Vaishnavismus', 'Shaivismus', 'Shaktismus', 'Smartismus', 'Keine Konfession'],
   Buddhismus: ['Theravada', 'Mahayana', 'Vajrayana', 'Zen', 'Keine Konfession'],
   Daoismus: ['Zhengyi', 'Quanzhen', 'Keine Konfession'],
   Shintoismus: ['Schrein-Shinto', 'Sektenshinto', 'Volks-Shinto', 'Keine Konfession']
}

function getBeliefInfo(value) {
   if (typeof value !== 'string') return null
   const trimmedValue = value.trim()
   if (!trimmedValue) return null
   return BELIEF_INFO_BY_VALUE[trimmedValue] || null
}

function getConfessionsForBelief(belief) {
   const beliefInfo = getBeliefInfo(belief)
   if (!beliefInfo) return []
   return Array.isArray(CONFESSIONS_BY_BELIEF[beliefInfo.value]) ? CONFESSIONS_BY_BELIEF[beliefInfo.value] : []
}

function formatBirthDateForDisplay(value) {
   const parsed = parseBirthDate(value)
   if (!parsed) return ''
   return `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}/${parsed.year}`
}

function formatBirthDateForTooltip(value) {
   const parsed = parseBirthDate(value)
   if (!parsed) return ''
   return `${String(parsed.day).padStart(2, '0')}.${String(parsed.month).padStart(2, '0')}.${parsed.year}`
}

function getBeliefLabelWithConfession(belief, confession) {
   const beliefInfo = getBeliefInfo(belief)
   if (!beliefInfo) return ''

   const normalizedConfession = typeof confession === 'string' ? confession.trim() : ''
   const validConfessions = getConfessionsForBelief(beliefInfo.value)
   const safeConfession = normalizedConfession && validConfessions.includes(normalizedConfession)
      ? normalizedConfession
      : 'ohne Konfession'

   return `${beliefInfo.value}, ${safeConfession}`
}

function updateBirthDateSummary(value) {
   if (!profileBirthDateValue) return
   const formatted = formatBirthDateForDisplay(value)
   profileBirthDateValue.textContent = formatted || 'Bitte wählen'
}

function updateBeliefSummary(belief, confession) {
   const beliefInfo = getBeliefInfo(belief)
   if (!beliefInfo) {
      profileBeliefValue.textContent = 'Bitte wählen'
      profileConfessionValue.textContent = 'Keine Konfession ausgewählt'
      return
   }

   profileBeliefValue.textContent = beliefInfo.value
   const displayConfession = typeof confession === 'string' && confession.trim() ? confession.trim() : 'Keine Konfession'
   profileConfessionValue.textContent = displayConfession
}

function getMonthLabel(month, year) {
   const monthDate = new Date(year, month - 1, 1)
   return monthDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function renderBirthDateCalendar() {
   if (!birthDateCalendarGrid || !birthDateCurrentMonth) return

   birthDateCurrentMonth.textContent = getMonthLabel(birthDatePickerView.month, birthDatePickerView.year)
   if (birthDateYearInput) {
      birthDateYearInput.value = String(birthDatePickerView.year)
   }
   birthDateCalendarGrid.innerHTML = ''

   const firstOfMonth = new Date(birthDatePickerView.year, birthDatePickerView.month - 1, 1)
   const weekdayOffset = (firstOfMonth.getDay() + 6) % 7
   const daysInMonth = new Date(birthDatePickerView.year, birthDatePickerView.month, 0).getDate()
   const selectedParsed = parseBirthDate(birthDatePickerView.selectedDate)

   for (let blank = 0; blank < weekdayOffset; blank++) {
      const spacer = document.createElement('span')
      spacer.className = 'birth-date-picker__day birth-date-picker__day--empty'
      birthDateCalendarGrid.appendChild(spacer)
   }

   for (let day = 1; day <= daysInMonth; day++) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'birth-date-picker__day'
      button.textContent = String(day)

      const isSelected = selectedParsed
         && selectedParsed.day === day
         && selectedParsed.month === birthDatePickerView.month
         && selectedParsed.year === birthDatePickerView.year

      if (isSelected) {
         button.classList.add('is-selected')
      }

      button.addEventListener('click', () => {
         const dayLabel = String(day).padStart(2, '0')
         const monthLabel = String(birthDatePickerView.month).padStart(2, '0')
         birthDatePickerView.selectedDate = `${dayLabel}/${monthLabel}/${birthDatePickerView.year}`
         birthDateApplyBtn.disabled = false
         renderBirthDateCalendar()
      })

      birthDateCalendarGrid.appendChild(button)
   }
}

function openBirthDateModal() {
   const parsed = parseBirthDate(profileBirthDateInput.value)
   const sourceDate = parsed ? new Date(parsed.year, parsed.month - 1, parsed.day) : new Date()

   birthDatePickerView = {
      month: sourceDate.getMonth() + 1,
      year: sourceDate.getFullYear(),
      selectedDate: parsed ? parsed.normalized : ''
   }

   birthDateApplyBtn.disabled = !parsed
   renderBirthDateCalendar()
   birthDateModal.classList.add('show-login')
}

function renderBeliefPickerReligions() {
   if (!beliefPickerReligions) return

   beliefPickerReligions.innerHTML = ''
   Object.values(BELIEF_INFO_BY_VALUE).forEach((beliefInfo) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'belief-picker__religion'
      button.dataset.value = beliefInfo.value
      button.innerHTML = `<i class="${beliefInfo.iconClass}"></i><span>${beliefInfo.value}</span>`

      if (beliefPickerState.belief === beliefInfo.value) {
         button.classList.add('is-selected')
      }

      button.addEventListener('click', () => {
         beliefPickerState.belief = beliefInfo.value
         const confessions = getConfessionsForBelief(beliefInfo.value)
         if (!confessions.includes(beliefPickerState.confession)) {
            beliefPickerState.confession = ''
         }
         renderBeliefPickerReligions()
         renderBeliefPickerConfessions()
      })

      beliefPickerReligions.appendChild(button)
   })
}

function renderBeliefPickerConfessions() {
   if (!beliefPickerConfession) return

   const selectedBelief = getBeliefInfo(beliefPickerState.belief)?.value || ''
   const confessions = selectedBelief
      ? getConfessionsForBelief(selectedBelief).filter((entry) => entry !== 'Keine Konfession')
      : []

   beliefPickerConfession.innerHTML = ''
   if (!selectedBelief) {
      const option = document.createElement('option')
      option.value = ''
      option.textContent = 'Bitte zuerst eine Religion wählen'
      beliefPickerConfession.appendChild(option)
      beliefPickerConfession.disabled = true
      return
   }

   beliefPickerConfession.disabled = false

   const emptyOption = document.createElement('option')
   emptyOption.value = ''
   emptyOption.textContent = 'Keine Konfession'
   beliefPickerConfession.appendChild(emptyOption)

   confessions.forEach((confession) => {
      const option = document.createElement('option')
      option.value = confession
      option.textContent = confession
      beliefPickerConfession.appendChild(option)
   })

   beliefPickerConfession.value = confessions.includes(beliefPickerState.confession)
      ? beliefPickerState.confession
      : ''
}

function openBeliefModal() {
   beliefPickerState = {
      belief: getBeliefInfo(profileBeliefInput.value)?.value || '',
      confession: typeof profileConfessionInput.value === 'string' ? profileConfessionInput.value.trim() : ''
   }

   renderBeliefPickerReligions()
   renderBeliefPickerConfessions()
   beliefModal.classList.add('show-login')
}

function updatePublicProfileZodiac(birthDate) {
   if (!publicProfileZodiac) return

   const zodiacSign = getZodiacSignByBirthDate(birthDate)
   if (!zodiacSign) {
      publicProfileZodiac.style.display = 'none'
      publicProfileZodiac.innerHTML = ''
      setPublicProfileTooltip(publicProfileZodiac, '')
      publicProfileZodiac.title = 'Sternzeichen'
      publicProfileZodiac.setAttribute('aria-label', 'Sternzeichen')
      return
   }

   const dateLabel = formatBirthDateForTooltip(birthDate)
   publicProfileZodiac.style.display = 'inline-flex'
   publicProfileZodiac.innerHTML = `<i class="${zodiacSign.iconClass}"></i>`
   setPublicProfileTooltip(publicProfileZodiac, `${dateLabel}, ${zodiacSign.name}`)
   publicProfileZodiac.title = zodiacSign.name
   publicProfileZodiac.setAttribute('aria-label', `${dateLabel}, ${zodiacSign.name}`)
}

function updatePublicProfileBelief(belief, confession) {
   if (!publicProfileBelief) return

   const beliefInfo = getBeliefInfo(belief)
   if (!beliefInfo) {
      publicProfileBelief.style.display = 'none'
      publicProfileBelief.innerHTML = ''
      setPublicProfileTooltip(publicProfileBelief, '')
      publicProfileBelief.title = 'Religion'
      publicProfileBelief.setAttribute('aria-label', 'Religion')
      return
   }

   const religionLabel = getBeliefLabelWithConfession(beliefInfo.value, confession)
   publicProfileBelief.style.display = 'inline-flex'
   publicProfileBelief.innerHTML = `<i class="${beliefInfo.iconClass}"></i>`
   setPublicProfileTooltip(publicProfileBelief, religionLabel)
   publicProfileBelief.title = beliefInfo.value
   publicProfileBelief.setAttribute('aria-label', religionLabel)
}

function clearPublicProfileTooltipHideTimer(element) {
   if (!element?._tooltipHideTimer) return
   clearTimeout(element._tooltipHideTimer)
   element._tooltipHideTimer = null
}

function hidePublicProfileTooltip(element) {
   if (!element) return
   clearPublicProfileTooltipHideTimer(element)
   element.classList.remove('is-tooltip-visible')
   if (activePublicProfileTooltip === element) {
      activePublicProfileTooltip = null
   }
}

function hideAllPublicProfileTooltips(exceptElement = null) {
   ;[publicProfileEmailLink, publicProfileEarlySupporter, publicProfileZodiac, publicProfileBelief].forEach((element) => {
      if (!element || element === exceptElement) return
      hidePublicProfileTooltip(element)
   })
}

function showPublicProfileTooltip(element, { autoHide = false, delay = 1600 } = {}) {
   if (!element?.dataset.tooltip) return

   hideAllPublicProfileTooltips(element)
   clearPublicProfileTooltipHideTimer(element)
   element.classList.add('is-tooltip-visible')
   activePublicProfileTooltip = element

   if (autoHide) {
      element._tooltipHideTimer = setTimeout(() => {
         hidePublicProfileTooltip(element)
      }, delay)
   }
}

function hasTouchTooltipInteraction() {
   return window.matchMedia('(hover: none), (pointer: coarse)').matches
}

function setPublicProfileTooltip(element, text) {
   if (!element) return

   const tooltipText = typeof text === 'string' ? text.trim() : ''
   if (!tooltipText) {
      delete element.dataset.tooltip
      element.removeAttribute('title')
      hidePublicProfileTooltip(element)
      return
   }

   element.dataset.tooltip = tooltipText
   element.removeAttribute('title')
}

function updatePublicProfileEarlySupporter(isEarlySupporter) {
   if (!publicProfileEarlySupporter) return

   if (!isEarlySupporter) {
      publicProfileEarlySupporter.style.display = 'none'
      publicProfileEarlySupporter.innerHTML = ''
      setPublicProfileTooltip(publicProfileEarlySupporter, '')
      publicProfileEarlySupporter.setAttribute('aria-label', 'Early Supporter')
      return
   }

   publicProfileEarlySupporter.style.display = 'inline-flex'
   publicProfileEarlySupporter.innerHTML = '<i class="fi fi-rc-seedling"></i>'
   setPublicProfileTooltip(publicProfileEarlySupporter, 'Early Supporter')
   publicProfileEarlySupporter.setAttribute('aria-label', 'Early Supporter')
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
   accentColorModal.style.setProperty('--accent-picker-text-color', getAccentTextColor(hexColor))
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
      document.documentElement.style.setProperty('--user-accent-text-color', '#FFF')
      return
   }

   document.body.classList.add(USER_THEME_CLASS)
   document.documentElement.style.setProperty('--user-accent-color', normalizedAccentColor)
   document.documentElement.style.setProperty('--user-accent-text-color', getAccentTextColor(normalizedAccentColor))
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
   if (!publicProfileFollowIconBtn) return

   const { canFollow, isFollowing, isOwnProfile } = currentPublicProfileFollowState

   if (isOwnProfile || !canFollow) {
      publicProfileFollowIconBtn.style.display = 'none'
      publicProfileFollowIconBtn.disabled = false
      publicProfileFollowIconBtn.innerHTML = '<i class="fi fi-rc-user-add"></i>'
      publicProfileFollowIconBtn.title = 'Folgen'
      publicProfileFollowIconBtn.setAttribute('aria-label', 'Folgen')
      return
   }

   publicProfileFollowIconBtn.style.display = 'inline-flex'
   publicProfileFollowIconBtn.disabled = false
   publicProfileFollowIconBtn.innerHTML = isFollowing
      ? '<i class="fi fi-rc-remove-user"></i>'
      : '<i class="fi fi-rc-user-add"></i>'
   publicProfileFollowIconBtn.title = isFollowing ? 'Entfolgen' : 'Folgen'
   publicProfileFollowIconBtn.setAttribute('aria-label', isFollowing ? 'Entfolgen' : 'Folgen')
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
   const publicPronouns = normalizePronouns(user?.pronouns)
   const publicBio = normalizeBio(user?.bio)
   const hasDisplayName = Boolean(publicDisplayName)
   const hasPronouns = Boolean(publicPronouns)
   const hasBio = Boolean(publicBio)

   publicProfileDisplayName.textContent = publicDisplayName
   publicProfileDisplayName.style.display = hasDisplayName ? 'block' : 'none'
   publicProfilePronouns.textContent = hasPronouns ? publicPronouns : ''
   publicProfilePronouns.style.display = hasPronouns ? 'inline' : 'none'
   publicProfileNameRow.style.display = (hasDisplayName || hasPronouns) ? 'flex' : 'none'
   publicProfileUsername.textContent = '@' + user.username
   updatePublicProfileZodiac(user?.birth_date)
   updatePublicProfileBelief(user?.belief, user?.confession)
   updatePublicProfileEarlySupporter(Boolean(user?.early_supporter))
   publicProfileBioText.textContent = hasBio ? publicBio : ''
   publicProfileBioBox.style.display = hasBio ? 'block' : 'none'
   updatePublicFollowStats()
   updateFollowButton()

   // Show unban modal if current user is restricted (regardless of which profile they're viewing)
   if (currentUser?.is_restricted === 1 && !unbanRequestModal.classList.contains('show-login')) {
      hideAll()
      unbanRequestReasonInput.value = ''
      updateCounter(unbanRequestReasonCounter, '', 500)
      clearMsg('unban-request-message')
      unbanRequestModal.classList.add('show-login')
   }

   const viewedRole = getUserRole(user)
   const viewedHasStaffBadge = viewedRole === USER_ROLES.ADMINISTRATOR || viewedRole === USER_ROLES.MODERATOR
   const viewerCanAccessAdminPanel = canAccessAdminPanel(currentUser)
   const viewedRoleLabel = viewedRole === USER_ROLES.ADMINISTRATOR ? 'Administrator*in' : 'Moderator*in'

   if (viewedHasStaffBadge) {
      publicProfileEmailLink.style.display = 'inline-flex'
      publicProfileEmailLink.href = '#'
      publicProfileEmailLink.innerHTML = '<i class="fi fi-rc-shield"></i>'
      publicProfileEmailLink.dataset.action = viewerCanAccessAdminPanel ? 'open-admin-list' : 'role-label'
      setPublicProfileTooltip(publicProfileEmailLink, viewedRoleLabel)
      publicProfileEmailLink.setAttribute('aria-label', viewerCanAccessAdminPanel ? 'Admin-Bereich öffnen' : viewedRoleLabel)
      if (viewerCanAccessAdminPanel) {
         publicProfileEmailLink.classList.remove('public-profile__action--badge')
      } else {
         publicProfileEmailLink.classList.add('public-profile__action--badge')
      }
   } else {
      hidePublicProfileTooltip(publicProfileEmailLink)
      publicProfileEmailLink.style.display = 'none'
      publicProfileEmailLink.href = '#'
      publicProfileEmailLink.innerHTML = '<i class="fi fi-rc-envelope"></i>'
      publicProfileEmailLink.dataset.action = ''
      publicProfileEmailLink.title = 'E-Mail schreiben'
      publicProfileEmailLink.setAttribute('aria-label', 'E-Mail schreiben')
      publicProfileEmailLink.classList.remove('public-profile__action--badge')
   }
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
   publicProfilePronouns.textContent = ''
   publicProfilePronouns.style.display = 'none'
   publicProfileNameRow.style.display = 'none'
   publicProfileUsername.textContent = '@unbekannt'
   updatePublicProfileZodiac(null)
   updatePublicProfileBelief(null, null)
   updatePublicProfileEarlySupporter(false)
   hideAllPublicProfileTooltips()
   publicProfileBioText.textContent = ''
   publicProfileBioBox.style.display = 'none'
    updatePublicFollowStats()
    updateFollowButton()
   publicProfileEmailLink.style.display = 'none'
   publicProfileEmailLink.href = '#'
   publicProfileEmailLink.innerHTML = '<i class="fi fi-rc-envelope"></i>'
   publicProfileEmailLink.dataset.action = ''
   publicProfileEmailLink.title = 'E-Mail schreiben'
   publicProfileEmailLink.setAttribute('aria-label', 'E-Mail schreiben')
   publicProfileEmailLink.classList.remove('public-profile__action--badge')
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

function renderAdminUserList(users, reportedUsers = [], unbanRequestUsers = []) {
   adminUserListResults.innerHTML = ''
   const viewerIsAdministrator = isAdminUser(currentUser)

   function createUserGroup(title, userList, options = {}) {
      const group = document.createElement('section')
      group.className = 'search-results__group'

      const heading = document.createElement('h3')
      heading.className = 'search-results__title'
      heading.textContent = title
      group.appendChild(heading)

      const list = document.createElement('div')
      list.className = 'search-results__list'

      if (!userList.length) {
         const empty = document.createElement('p')
         empty.className = 'search-results__empty'
         empty.textContent = 'Keine User gefunden.'
         list.appendChild(empty)
      } else {
         userList.forEach((user) => {
         const wrap = document.createElement('div')
         wrap.className = 'admin-user-list__item-wrap'

         const item = document.createElement('div')
         item.className = 'search-results__item admin-user-list__item'

         const menuButton = document.createElement('button')
         menuButton.type = 'button'
         menuButton.className = 'admin-user-list__menu'
         menuButton.innerHTML = '<i class="fi fi-rr-menu-dots-vertical"></i>'
         menuButton.title = 'Aktionen'
         menuButton.setAttribute('aria-label', `Aktionen für @${user.username}`)

         const usernameButton = document.createElement('button')
         usernameButton.type = 'button'
         usernameButton.className = 'admin-user-list__username'
         usernameButton.textContent = '@' + user.username

         usernameButton.addEventListener('click', async () => {
            await openPublicProfileByUsername(user.username)
         })

         const actions = document.createElement('div')
         actions.className = 'admin-user-list__actions'

         const reportsButton = document.createElement('button')
         reportsButton.type = 'button'
         reportsButton.className = 'admin-user-list__reports'
         reportsButton.textContent = options.reportsLabel || 'Tickets'

         reportsButton.addEventListener('click', async () => {
            await openAdminReports(user.username, options.initialReportsTab || 'meldungen')
         })

         actions.appendChild(reportsButton)

         const targetRole = normalizeUserRole(user?.role)

         if (viewerIsAdministrator && !user.isProtected && targetRole !== USER_ROLES.ADMINISTRATOR) {
            const roleButton = document.createElement('button')
            roleButton.type = 'button'
            roleButton.className = 'admin-user-list__moderator-toggle'
            roleButton.textContent = targetRole === USER_ROLES.MODERATOR
               ? 'Moderator*in degradieren'
               : 'Zu Moderator*in befördern'

            roleButton.addEventListener('click', async () => {
               roleButton.disabled = true
               try {
                  const response = await fetch(`/api/auth/admin/users/${encodeURIComponent(user.username)}/moderator-toggle`, {
                     method: 'PATCH',
                     credentials: 'include'
                  })

                  const data = await response.json()
                  if (!response.ok) {
                     showMsg('admin-user-list-message', data.error || 'Rolle konnte nicht geändert werden.', 'error')
                     roleButton.disabled = false
                     return
                  }

                  showMsg('admin-user-list-message', data.message || 'Rolle aktualisiert.', 'success')
                  await loadAdminUserList(adminUserListSearch.value)
               } catch (_) {
                  showMsg('admin-user-list-message', 'Server nicht erreichbar.', 'error')
                  roleButton.disabled = false
               }
            })

            actions.appendChild(roleButton)
         }

         const canRestrict = () => {
            // Cannot restrict protected users
            if (user.isProtected) return false
            
            // Cannot restrict oneself
            if (currentUser?.id === user.id) return false
            
            const viewerRole = normalizeUserRole(currentUser?.role)
            
            // Moderators can only restrict normal users
            if (viewerRole === USER_ROLES.MODERATOR) {
               return targetRole === USER_ROLES.USER
            }
            
            // Admins can restrict normal users and moderators (but not other admins)
            if (viewerIsAdministrator) {
               return targetRole !== USER_ROLES.ADMINISTRATOR
            }
            
            return false
         }

         if (canRestrict()) {
            const restrictButton = document.createElement('button')
            restrictButton.type = 'button'
            restrictButton.className = 'admin-user-list__restrict'
            restrictButton.textContent = user.isRestricted ? 'Freigeben' : 'Nutzer einschränken'

            restrictButton.addEventListener('click', async () => {
               restrictButton.disabled = true
               try {
                  const response = await fetch(`/api/auth/admin/users/${encodeURIComponent(user.username)}/restrict`, {
                     method: 'PATCH',
                     credentials: 'include'
                  })

                  const data = await response.json()
                  if (!response.ok) {
                     showMsg('admin-user-list-message', data.error || 'Einschränkung konnte nicht geändert werden.', 'error')
                     restrictButton.disabled = false
                     return
                  }

                  showMsg('admin-user-list-message', data.message || 'Einschränkung aktualisiert.', 'success')
                  await loadAdminUserList(adminUserListSearch.value)
               } catch (_) {
                  showMsg('admin-user-list-message', 'Server nicht erreichbar.', 'error')
                  restrictButton.disabled = false
               }
            })

            actions.appendChild(restrictButton)
         }

         if (user.isProtected) {
            const protectedLabel = document.createElement('span')
            protectedLabel.className = 'admin-user-list__protected'
            protectedLabel.textContent = 'Geschütztes Administrator*innen-Konto'
            actions.appendChild(protectedLabel)
         }

         if (viewerIsAdministrator && !user.isProtected) {
            const deleteButton = document.createElement('button')
            deleteButton.type = 'button'
            deleteButton.className = 'admin-user-list__delete'
            deleteButton.textContent = 'Nutzer löschen'

            deleteButton.addEventListener('click', async () => {
               const confirmed = window.confirm(`Willst du @${user.username} wirklich löschen?`)
               if (!confirmed) return

               try {
                  const response = await fetch(`/api/auth/admin/users/${encodeURIComponent(user.username)}`, {
                     method: 'DELETE',
                     credentials: 'include'
                  })

                  const data = await response.json()
                  if (!response.ok) {
                     if (response.status === 404) {
                        showMsg('admin-user-list-message', `Nutzer @${user.username} war bereits entfernt.`, 'success')
                        await loadAdminUserList(adminUserListSearch.value)
                        return
                     }
                     showMsg('admin-user-list-message', data.error || 'Nutzer konnte nicht gelöscht werden.', 'error')
                     return
                  }

                  showMsg('admin-user-list-message', data.message || 'Nutzer gelöscht.', 'success')
                  await loadAdminUserList(adminUserListSearch.value)
               } catch (_) {
                  showMsg('admin-user-list-message', 'Server nicht erreichbar.', 'error')
               }
            })

            actions.appendChild(deleteButton)
         }

         menuButton.addEventListener('click', () => {
            adminUserListResults.querySelectorAll('.admin-user-list__actions').forEach((el) => {
               if (el !== actions) el.classList.remove('is-open')
            })
            actions.classList.toggle('is-open')
         })

         item.appendChild(menuButton)
         item.appendChild(usernameButton)
         wrap.appendChild(item)
         wrap.appendChild(actions)
         list.appendChild(wrap)
      })
      }

      group.appendChild(list)
      return group
   }

   const unbanRequestsGroup = createUserGroup('Freigaben', unbanRequestUsers, {
      reportsLabel: 'Freigaben',
      initialReportsTab: 'entbannungen'
   })
   adminUserListResults.appendChild(unbanRequestsGroup)

   const reportsGroup = createUserGroup('Meldungen', reportedUsers)
   adminUserListResults.appendChild(reportsGroup)

   adminUserListResults.appendChild(createUserGroup('Usernames', users))
}

async function loadAdminUserList(query = '') {
   if (!canAccessAdminPanel(currentUser)) {
      return showMsg('admin-user-list-message', 'Kein Zugriff auf den Admin-Bereich.', 'error')
   }

   const trimmedQuery = typeof query === 'string' ? query.trim() : ''

   try {
      const usersUrl = trimmedQuery
         ? `/api/auth/admin/users?q=${encodeURIComponent(trimmedQuery)}`
         : '/api/auth/admin/users'
      const reportsUrl = trimmedQuery
         ? `/api/auth/admin/users/with-open-reports?q=${encodeURIComponent(trimmedQuery)}`
         : '/api/auth/admin/users/with-open-reports'

      const [usersResp, reportsResp, unbanRequestsResp] = await Promise.all([
         fetch(usersUrl, { credentials: 'include' }),
         fetch(reportsUrl, { credentials: 'include' }),
         fetch('/api/auth/admin/unban-requests', { credentials: 'include' })
      ])

      const usersData = await usersResp.json()
      if (!usersResp.ok) {
         showMsg('admin-user-list-message', usersData.error || 'Userliste konnte nicht geladen werden.', 'error')
         renderAdminUserList([], [])
         return
      }

      const reportsData = reportsResp.ok ? await reportsResp.json() : { users: [] }
      const unbanRequestsData = unbanRequestsResp.ok ? await unbanRequestsResp.json() : { requests: [] }

      const allUsers = Array.isArray(usersData.users) ? usersData.users : []
      const usersByUsername = new Map(
         allUsers
            .filter((user) => user?.username)
            .map((user) => [String(user.username).trim().toLowerCase(), user])
      )

      const seenUsernames = new Set()
      const unbanRequestUsers = (Array.isArray(unbanRequestsData.requests) ? unbanRequestsData.requests : [])
         .map((request) => request?.username ? String(request.username).trim().toLowerCase() : '')
         .filter(Boolean)
         .filter((normalizedUsername) => {
            if (seenUsernames.has(normalizedUsername)) return false
            seenUsernames.add(normalizedUsername)
            return true
         })
         .map((normalizedUsername) => usersByUsername.get(normalizedUsername))
         .filter(Boolean)

      clearMsg('admin-user-list-message')
      renderAdminUserList(
         allUsers,
         Array.isArray(reportsData.users) ? reportsData.users : [],
         unbanRequestUsers
      )
   } catch (_) {
      showMsg('admin-user-list-message', 'Server nicht erreichbar.', 'error')
      renderAdminUserList([], [])
   }
}

async function openAdminUserListModal() {
   if (!canAccessAdminPanel(currentUser)) {
      return showPublicProfileNotice('Kein Zugriff auf den Admin-Bereich.', 'error', 3000)
   }

   adminUserListSearch.value = ''
   clearMsg('admin-user-list-message')
   renderAdminUserList([], [])

   hideAll()
   adminUserListModal.classList.add('show-search')
   await loadAdminUserList('')
   adminUserListSearch.focus()
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
   updateDisplayNameCounter(profileDisplayNameInput.value)
   profilePronounsInput.value = normalizePronouns(user?.pronouns)
   updatePronounsCounter(profilePronounsInput.value)
   profileBioInput.value = normalizeBio(user?.bio)
   updateBioCounter(profileBioInput.value)
   profileBirthDateInput.value = typeof user.birth_date === 'string' ? user.birth_date : ''
   updateBirthDateSummary(profileBirthDateInput.value)
   profileBeliefInput.value = getBeliefInfo(user?.belief)?.value || ''
   profileConfessionInput.value = typeof user?.confession === 'string' ? user.confession.trim() : ''
   updateBeliefSummary(profileBeliefInput.value, profileConfessionInput.value)
   profileUsernameInput.value = user.username
   updateUsernameCounter(profileUsernameInput.value)
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
   startRestrictionCheck()
}

function setLoggedOut() {
   function startRestrictionCheck() {
      if (restrictionCheckInterval) return // Already polling
   
      let lastRestrictionStatus = currentUser?.is_restricted ? 1 : 0
   
      restrictionCheckInterval = setInterval(async () => {
         try {
            const response = await fetch('/api/auth/me', { credentials: 'include' })
            if (!response.ok) return // Skip on error, retry next interval
         
            const data = await response.json()
            const currentRestrictionStatus = data.user?.is_restricted ? 1 : 0
         
            // If status changed from unrestricted to restricted, show modal immediately
            if (lastRestrictionStatus === 0 && currentRestrictionStatus === 1) {
               currentUser = data.user // Update currentUser with new data
               hideAll()
               unbanRequestReasonInput.value = ''
               updateCounter(unbanRequestReasonCounter, '', 500)
               clearMsg('unban-request-message')
               unbanRequestModal.classList.add('show-login')
            }
         
            lastRestrictionStatus = currentRestrictionStatus
            currentUser = data.user // Keep currentUser in sync
         } catch (err) {
            console.error('[RESTRICTION CHECK ERROR]', err)
            // Silently skip this interval, will retry next time
         }
      }, 4000) // Poll every 4 seconds
   }

   function stopRestrictionCheck() {
      if (restrictionCheckInterval) {
         clearInterval(restrictionCheckInterval)
         restrictionCheckInterval = null
      }
   }

   stopRestrictionCheck()
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
   updateDisplayNameCounter('')
   profilePronounsInput.value = ''
   updatePronounsCounter('')
   profileBioInput.value = ''
   updateBioCounter('')
   profileBirthDateInput.value = ''
   updateBirthDateSummary('')
   profileBeliefInput.value = ''
   profileConfessionInput.value = ''
   updateBeliefSummary('', '')
   profileUsernameInput.value = ''
   updateUsernameCounter('')
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

publicProfileReportBtn.addEventListener('click', () => {
   if (!currentPublicProfileUser?.username) return
   hideAll()
   if (reportReasonInput) reportReasonInput.value = ''
   updateCounter(reportReasonCounter, '', 200)
   if (reportMessage) clearMsg('report-message')
   reportModal.classList.add('show-login')
})

reportCancelBtn.addEventListener('click', hideAll)
adminReportsCloseBtn.addEventListener('click', hideAll)

adminReportsTabMeldungen?.addEventListener('click', () => {
   setAdminReportsTab('meldungen')
})

adminReportsTabEntbannungen?.addEventListener('click', () => {
   setAdminReportsTab('entbannungen')
})

reportReasonInput?.addEventListener('input', () => {
   updateCounter(reportReasonCounter, reportReasonInput.value, 200)
})

unbanRequestCancelBtn?.addEventListener('click', hideAll)

unbanRequestReasonInput?.addEventListener('input', () => {
   updateCounter(unbanRequestReasonCounter, unbanRequestReasonInput.value, 500)
})

reportSubmitBtn?.addEventListener('click', async () => {
   if (!currentUser) {
      showMsg('report-message', 'Du musst angemeldet sein, um zu melden.', 'error')
      return
   }

   const targetUsername = currentPublicProfileUser?.username
   if (!targetUsername) {
      showMsg('report-message', 'Benutzer konnte nicht ermittelt werden.', 'error')
      return
   }

   if (String(targetUsername).trim().toLowerCase() === String(currentUser.username || '').trim().toLowerCase()) {
      showMsg('report-message', 'Du kannst dich selbst nicht melden.', 'error')
      return
   }

   reportSubmitBtn.disabled = true
   reportSubmitBtn.textContent = 'Meldet…'

   try {
      const reason = (reportReasonInput?.value || '').trim()
      const response = await fetch(`/api/auth/report/${encodeURIComponent(targetUsername)}`, {
         method: 'POST',
         credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ reason: reason || null })
      })

      const data = await response.json()
      if (!response.ok) {
         showMsg('report-message', data.error || 'Meldung konnte nicht gesendet werden.', 'error')
      } else {
         showMsg('report-message', data.message || 'Meldung erfolgreich gesendet.', 'success')
         setTimeout(() => {
            hideAll()
         }, 900)
      }
   } catch (_) {
      showMsg('report-message', 'Server nicht erreichbar.', 'error')
   } finally {
      reportSubmitBtn.disabled = false
      reportSubmitBtn.textContent = 'Melden'
   }
})

unbanRequestSubmitBtn?.addEventListener('click', async () => {
   if (!currentUser) {
      showMsg('unban-request-message', 'Du musst angemeldet sein, um einen Antrag einzureichen.', 'error')
      return
   }

   unbanRequestSubmitBtn.disabled = true
   unbanRequestSubmitBtn.textContent = 'Wird gesendet…'

   try {
      const reason = (unbanRequestReasonInput?.value || '').trim()
      if (!reason) {
         showMsg('unban-request-message', 'Bitte gib einen Grund an.', 'error')
         unbanRequestSubmitBtn.disabled = false
         unbanRequestSubmitBtn.textContent = 'Anfrage einreichen'
         return
      }

      const response = await fetch('/api/auth/unban-request', {
         method: 'POST',
         credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ reason })
      })

      const data = await response.json()
      if (!response.ok) {
         showMsg('unban-request-message', data.error || 'Anfrage konnte nicht gesendet werden.', 'error')
      } else {
         showMsg('unban-request-message', data.message || 'Freigabeanfrage erfolgreich gesendet.', 'success')
         setTimeout(() => {
            hideAll()
         }, 900)
      }
   } catch (_) {
      showMsg('unban-request-message', 'Server nicht erreichbar.', 'error')
   } finally {
      unbanRequestSubmitBtn.disabled = false
      unbanRequestSubmitBtn.textContent = 'Anfrage einreichen'
   }
})

if (publicProfileFollowIconBtn) {
   publicProfileFollowIconBtn.addEventListener('click', async () => {
      if (!currentPublicProfileUser?.username) return

      const username = currentPublicProfileUser.username
      const willFollow = !currentPublicProfileFollowState.isFollowing

      if (!currentUser) {
         showPublicProfileNotice('Bitte melde dich an, um Profile zu folgen.', 'error', 4000)
         return
      }

      publicProfileFollowIconBtn.disabled = true

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
         publicProfileFollowIconBtn.disabled = false
      }
   })
}

if (publicProfileFollowersTrigger) {
   publicProfileFollowersTrigger.addEventListener('click', async () => {
      await openFollowList('followers')
   })
}

if (publicProfileFollowingTrigger) {
   publicProfileFollowingTrigger.addEventListener('click', async () => {
      await openFollowList('following')
   })
}

;[publicProfileEmailLink, publicProfileEarlySupporter, publicProfileZodiac, publicProfileBelief].forEach((element) => {
   if (!element) return

   element.addEventListener('mouseenter', () => {
      if (!element.dataset.tooltip) return
      showPublicProfileTooltip(element)
   })

   element.addEventListener('mouseleave', () => {
      hidePublicProfileTooltip(element)
   })
})

publicProfileEmailLink.addEventListener('click', async (event) => {
   const canOpenAdminList = publicProfileEmailLink.dataset.action === 'open-admin-list'

   if (hasTouchTooltipInteraction()) {
      event.preventDefault()

      const tooltipVisible = publicProfileEmailLink.classList.contains('is-tooltip-visible')
      if (!tooltipVisible) {
         showPublicProfileTooltip(publicProfileEmailLink, { autoHide: !canOpenAdminList })
         return
      }

      if (!canOpenAdminList) {
         showPublicProfileTooltip(publicProfileEmailLink, { autoHide: true })
         return
      }

      hidePublicProfileTooltip(publicProfileEmailLink)
      await openAdminUserListModal()
      return
   }

   if (publicProfileEmailLink.dataset.action !== 'open-admin-list') {
      event.preventDefault()
      showPublicProfileTooltip(publicProfileEmailLink, { autoHide: false })
      return
   }

   event.preventDefault()
   await openAdminUserListModal()
})

publicProfileEarlySupporter.addEventListener('click', (event) => {
   event.preventDefault()
   showPublicProfileTooltip(publicProfileEarlySupporter, { autoHide: hasTouchTooltipInteraction() })
})

;[publicProfileZodiac, publicProfileBelief].forEach((element) => {
   if (!element) return

   element.addEventListener('click', (event) => {
      event.preventDefault()
      showPublicProfileTooltip(element, { autoHide: hasTouchTooltipInteraction() })
   })
})

document.addEventListener('click', (event) => {
   if (!activePublicProfileTooltip) return

   const tooltipOwner = activePublicProfileTooltip
   if (tooltipOwner === event.target || tooltipOwner.contains(event.target)) {
      return
   }

   hideAllPublicProfileTooltips()
})

adminUserListSearch.addEventListener('input', () => {
   if (adminUserListDebounceTimer) {
      clearTimeout(adminUserListDebounceTimer)
   }

   adminUserListDebounceTimer = setTimeout(() => {
      loadAdminUserList(adminUserListSearch.value)
   }, 200)
})

adminUserListForm.addEventListener('submit', (event) => {
   event.preventDefault()
   loadAdminUserList(adminUserListSearch.value)
})

async function openSharedProfileFromUrl() {
   const sharedUsername = getSharedUsernameFromPath()
   if (!sharedUsername) return

   await openPublicProfileByUsername(sharedUsername)
}

profileBtn.addEventListener('click', showProfileModal)
profileAvatarButton.addEventListener('click', () => profileAvatarInput.click())
profileAccentColorOpen.addEventListener('click', openAccentColorModal)
profileBirthDateOpen.addEventListener('click', openBirthDateModal)
profileBeliefOpen.addEventListener('click', openBeliefModal)

accentColorModal.addEventListener('click', (event) => {
   if (event.target === accentColorModal) {
      accentColorModal.classList.remove('show-login')
   }
})

birthDateModal.addEventListener('click', (event) => {
   if (event.target === birthDateModal) {
      birthDateModal.classList.remove('show-login')
   }
})

beliefModal.addEventListener('click', (event) => {
   if (event.target === beliefModal) {
      beliefModal.classList.remove('show-login')
   }
})

birthDatePrevMonthBtn.addEventListener('click', () => {
   if (birthDatePickerView.month === 1) {
      birthDatePickerView.month = 12
      birthDatePickerView.year -= 1
   } else {
      birthDatePickerView.month -= 1
   }
   renderBirthDateCalendar()
})

birthDateNextMonthBtn.addEventListener('click', () => {
   if (birthDatePickerView.month === 12) {
      birthDatePickerView.month = 1
      birthDatePickerView.year += 1
   } else {
      birthDatePickerView.month += 1
   }
   renderBirthDateCalendar()
})

birthDateYearInput.addEventListener('input', () => {
   const yearValue = Number.parseInt(birthDateYearInput.value, 10)
   if (!Number.isInteger(yearValue)) return
   if (yearValue < BIRTH_DATE_MIN_YEAR || yearValue > BIRTH_DATE_MAX_YEAR) return

   birthDatePickerView.year = yearValue
   renderBirthDateCalendar()
})

birthDateApplyBtn.addEventListener('click', () => {
   profileBirthDateInput.value = birthDatePickerView.selectedDate || ''
   updateBirthDateSummary(profileBirthDateInput.value)
   birthDateModal.classList.remove('show-login')
})

birthDateClearBtn.addEventListener('click', () => {
   birthDatePickerView.selectedDate = ''
   birthDateApplyBtn.disabled = true
   profileBirthDateInput.value = ''
   updateBirthDateSummary('')
   birthDateModal.classList.remove('show-login')
})

beliefPickerConfession.addEventListener('change', () => {
   beliefPickerState.confession = beliefPickerConfession.value
})

beliefApplyBtn.addEventListener('click', () => {
   profileBeliefInput.value = beliefPickerState.belief || ''
   profileConfessionInput.value = beliefPickerState.confession || ''
   updateBeliefSummary(profileBeliefInput.value, profileConfessionInput.value)
   beliefModal.classList.remove('show-login')
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
   updateUsernameCounter(profileUsernameInput.value)
})

profileDisplayNameInput.addEventListener('input', () => {
   const value = profileDisplayNameInput.value.trim()
   profileDisplayName.textContent = value
   profileDisplayName.style.display = value ? 'block' : 'none'
   updateDisplayNameCounter(profileDisplayNameInput.value)
})

profilePronounsInput.addEventListener('input', () => {
   updatePronounsCounter(profilePronounsInput.value)
})

profileBioInput.addEventListener('input', () => {
   updateBioCounter(profileBioInput.value)
})

profileForm.addEventListener('submit', async (e) => {
   e.preventDefault()
   clearMsg('profile-message')

   const full_name = profileFullNameInput.value.trim()
   const profile_name = profileDisplayNameInput.value
   const pronouns = normalizePronouns(profilePronounsInput.value)
   const bio = normalizeBio(profileBioInput.value)
   const birth_date = profileBirthDateInput.value.trim()
   const belief = profileBeliefInput.value.trim()
   const confession = profileConfessionInput.value.trim()
   const trimmedProfileName = typeof profile_name === 'string' ? profile_name.trim() : ''
   const username  = profileUsernameInput.value.trim()
   const accent_color = normalizeHexColor(profileAccentColorInput.value)

   if (!full_name || !username) {
      return showMsg('profile-message', 'Vollständiger Name und Benutzername sind erforderlich.', 'error')
   }

   if (trimmedProfileName.length > 20) {
      return showMsg('profile-message', 'Der Profilname darf maximal 20 Zeichen lang sein.', 'error')
   }

   if (username.length > 20) {
      return showMsg('profile-message', 'Der Benutzername darf maximal 20 Zeichen lang sein.', 'error')
   }

   if (pronouns.length > 30) {
      return showMsg('profile-message', 'Die Pronomen dürfen maximal 30 Zeichen lang sein.', 'error')
   }

   if (bio.length > 200) {
      return showMsg('profile-message', 'Die Bio darf maximal 200 Zeichen lang sein.', 'error')
   }

   if (birth_date && !parseBirthDate(birth_date)) {
      return showMsg('profile-message', 'Das Geburtsdatum muss im Format dd/mm/yyyy sein.', 'error')
   }

   if (belief && !getBeliefInfo(belief)) {
      return showMsg('profile-message', 'Bitte wähle einen gültigen Glauben aus der Liste aus.', 'error')
   }

   if (!belief && confession) {
      return showMsg('profile-message', 'Bitte wähle zuerst eine Religion aus.', 'error')
   }

   if (belief && confession && !getConfessionsForBelief(belief).includes(confession)) {
      return showMsg('profile-message', 'Bitte wähle eine gültige Konfession passend zur Religion aus.', 'error')
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
         body: JSON.stringify({ full_name, profile_name, pronouns, bio, birth_date, belief, confession, username, accent_color })
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




