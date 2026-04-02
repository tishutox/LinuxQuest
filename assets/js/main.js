/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById('nav-menu'),
      navToggle = document.getElementById('nav-toggle'),
      navClose = document.getElementById('nav-close');

navToggle.addEventListener('click', () => {
   navMenu.classList.add('show-menu');
});
navClose.addEventListener('click',  () => {
   navMenu.classList.remove('show-menu');
});

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
const searchFormIcon = document.getElementById('search-form-icon')
const finderNavLink = document.getElementById('nav-finder-link')
const savedNavLink = document.getElementById('nav-saved-link')
const finderFilterOptions = document.getElementById('finder-filter-options')
const finderDistroResults = document.getElementById('finder-distro-results')
const finderFilterCodebase = document.getElementById('finder-filter-codebase')
const finderFilterCountryOpen = document.getElementById('finder-filter-country-open')
const finderFilterCountryValue = document.getElementById('finder-filter-country-value')
const finderFilterCountrySubvalue = document.getElementById('finder-filter-country-subvalue')
const finderCountryModal = document.getElementById('finder-country-modal')
const finderCountryClose = document.getElementById('finder-country-close')
const finderCountryPickerCountries = document.getElementById('finder-country-picker-countries')
const finderCountryApplyBtn = document.getElementById('finder-country-apply-btn')
const finderFilterSpeedMin = document.getElementById('finder-filter-speed-min')
const finderFilterSpeedMinValue = document.getElementById('finder-filter-speed-min-value')
const finderFilterSpeedMax = document.getElementById('finder-filter-speed-max')
const finderFilterSpeedMaxValue = document.getElementById('finder-filter-speed-max-value')
const finderTagsContainer = document.getElementById('finder-tags-container')
const finderTagButtons = Array.from(finderTagsContainer?.querySelectorAll('.finder-filter__tag-option') || [])
const FINDER_TAG_LABEL_BY_VALUE = Object.fromEntries(
   finderTagButtons.map((button) => [button.dataset.value, button.textContent.trim()])
)
const distroModal = document.getElementById('distro-modal')
const distroModalClose = document.getElementById('distro-modal-close')
const distroModalAvatar = document.getElementById('distro-modal-avatar')
const distroModalName = document.getElementById('distro-modal-name')
const distroModalCodebase = document.getElementById('distro-modal-codebase')
const distroModalIso = document.getElementById('distro-modal-iso')
const distroModalDocs = document.getElementById('distro-modal-docs')
const distroModalDownload = document.getElementById('distro-modal-download')
const distroModalTags = document.getElementById('distro-modal-tags')
const distroModalDescriptionBox = document.getElementById('distro-modal-description-box')
const distroModalDescription = document.getElementById('distro-modal-description')
const distroModalProsBox = document.getElementById('distro-modal-pros-box')
const distroModalProsList = document.getElementById('distro-modal-pros')
const distroModalConsBox = document.getElementById('distro-modal-cons-box')
const distroModalConsList = document.getElementById('distro-modal-cons')
const distroModalVideo = document.getElementById('distro-modal-video')
const distroModalVideoIframe = document.getElementById('distro-modal-video-iframe')
const distroModalVideoPlay = document.getElementById('distro-modal-video-play')
const distroModalBookmarkBtn = document.getElementById('distro-modal-bookmark-btn')
const distroRatingAverage = document.getElementById('distro-rating-average')
const distroRatingStars = document.getElementById('distro-rating-stars')
const distroRatingReviews = document.getElementById('distro-rating-reviews')
const distroRatingViewAll = document.getElementById('distro-rating-view-all')
const distroRatingOpenBtn = document.getElementById('distro-rating-open')
const distroRatingModal = document.getElementById('distro-rating-modal')
const distroRatingModalClose = document.getElementById('distro-rating-modal-close')
const distroRatingSelectStars = document.getElementById('distro-rating-select-stars')
const distroRatingSelectedValue = document.getElementById('distro-rating-selected-value')
const distroRatingText = document.getElementById('distro-rating-text')
const distroRatingCounter = document.getElementById('distro-rating-counter')
const distroRatingSubmit = document.getElementById('distro-rating-submit')
const distroRatingCancel = document.getElementById('distro-rating-cancel')
const distroRatingMessage = document.getElementById('distro-rating-message')
const distroReviewsModal = document.getElementById('distro-reviews-modal')
const distroReviewsModalClose = document.getElementById('distro-reviews-modal-close')
const distroReviewsModalCloseBtn = document.getElementById('distro-reviews-close-btn')
const distroReviewsModalList = document.getElementById('distro-reviews-modal-list')

let finderTagStates = {}
let currentDistroKey = ''
let currentDistroName = ''
let currentDistroData = null
let currentDistroUserReview = null
let distroRatingSelection = 0
let currentDistroReviews = []
let savedDistroEntries = []
let savedDistroKeySet = new Set()

const FINDER_ISO_SIZE_MIN_MB = 700
const FINDER_ISO_SIZE_MAX_MB = 5000

const FINDER_COUNTRY_OPTIONS = [
   { value: 'au', label: 'Australien' },
   { value: 'international', label: 'International' },
   { value: 'br', label: 'Brasilien' },
   { value: 'ca', label: 'Kanada' },
   { value: 'ch', label: 'Schweiz' },
   { value: 'de', label: 'Deutschland' },
   { value: 'es', label: 'Spanien' },
   { value: 'fr', label: 'Frankreich' },
   { value: 'ie', label: 'Irland' },
   { value: 'in', label: 'Indien' },
   { value: 'it', label: 'Italien' },
   { value: 'jp', label: 'Japan' },
   { value: 'lv', label: 'Lettland' },
   { value: 'mx', label: 'Mexiko' },
   { value: 'nl', label: 'Niederlande' },
   { value: 'pl', label: 'Polen' },
   { value: 'ro', label: 'Rumänien' },
   { value: 'se', label: 'Schweden' },
   { value: 'tw', label: 'Taiwan' },
   { value: 'uk', label: 'Vereinigtes Königreich' },
   { value: 've', label: 'Venezuela' },
   { value: 'us', label: 'USA' }
].sort((first, second) => first.label.localeCompare(second.label, 'de'))
const FINDER_COUNTRY_LABEL_BY_VALUE = Object.fromEntries(
   FINDER_COUNTRY_OPTIONS.map((country) => [country.value, country.label])
)

const DISTRO_FINDER_DATA = [
   { name: 'Ubuntu', codebase: 'ubuntu', countries: ['uk'], isoSizeMb: 5900, tags: ['einsteigerfreundlich', 'long-term-support', 'office', 'Laptop'], docsUrl: 'https://help.ubuntu.com', downloadUrl: 'https://ubuntu.com/download', description: 'Bekannte Desktop-Distribution mit starkem LTS-Fokus.', logo: 'assets/img/distros/Ubuntu Server.png', pros: ['Große Community und sehr viel Dokumentation', 'LTS-Versionen mit langem Sicherheitssupport', 'Breite Hardware-Unterstützung out of the box'], cons: ['Snap-Standardpakete starten teils langsamer', 'Relativ umfangreiche Default-Installation'] },
   { name: 'Kubuntu', codebase: 'ubuntu', countries: ['uk'], isoSizeMb: 4900, tags: ['gutes-design', 'einsteigerfreundlich', 'office', 'Laptop'], docsUrl: 'https://help.ubuntu.com/community/Kubuntu', downloadUrl: 'https://kubuntu.org/getkubuntu/', description: 'Ubuntu mit KDE Plasma und Fokus auf ein aufgeräumtes Desktop-Erlebnis.', logo: 'assets/img/distros/Kubuntu.png', videoUrl: 'https://youtu.be/P_CJmrFYcic?si=O-v4VXB8Vaequ1dc', pros: ['KDE Plasma mit vielen GUI-Tools ab Werk', 'Geringere Hardware-Anforderungen als GNOME-Varianten', 'Stabile Basis dank Ubuntu LTS'], cons: ['Updates teilweise verzögert gegenüber Ubuntu GNOME', 'Mischung aus DEB, Flatpak und wenigen Snaps notwendig'] },
   { name: 'Ubuntu Studio', codebase: 'ubuntu', countries: ['uk'], isoSizeMb: 4600, tags: ['content-creation', 'office', 'einsteigerfreundlich', 'Laptop'], docsUrl: 'https://ubuntustudio.org/support/', downloadUrl: 'https://ubuntustudio.org/download/', description: 'Ubuntu-Variante für Audio-, Video- und Grafikproduktionen.', logo: 'assets/img/distros/Ubuntu Studio.png', videoUrl: 'https://youtu.be/SW4xlWedCpI?si=5QREH5SV6HNOHkuR' },
   { name: 'Xubuntu', codebase: 'ubuntu', countries: ['uk'], isoSizeMb: 2600, tags: ['lightweight', 'einsteigerfreundlich', 'bildung', 'Laptop'], docsUrl: 'https://xubuntu.org/help/', downloadUrl: 'https://xubuntu.org/download', description: 'Leichtgewichtiges Ubuntu mit Xfce-Desktop.', logo: 'assets/img/distros/Xubuntu.png', videoUrl: 'https://youtu.be/zYpFXSAaGmg?si=Q8f2lYrhAFveUfVB' },
   { name: 'Lubuntu', codebase: 'ubuntu', countries: ['uk'], isoSizeMb: 2200, tags: ['lightweight', 'einsteigerfreundlich', 'bildung', 'Laptop'], docsUrl: 'https://manual.lubuntu.me', downloadUrl: 'https://lubuntu.me/downloads/', description: 'Minimalistisches Ubuntu mit LXQt für ältere Hardware.', logo: 'assets/img/distros/Lubuntu.png', videoUrl: 'https://youtu.be/RQEsA3ZzmvY?si=bvzSnaQzTCVc3JlD' },
   { name: 'Linux Mint', codebase: 'ubuntu', countries: ['ie'], isoSizeMb: 2700, tags: ['einsteigerfreundlich', 'long-term-support', 'office', 'Laptop'], docsUrl: 'https://linuxmint-installation-guide.readthedocs.io/', downloadUrl: 'https://www.linuxmint.com/download.php', description: 'Ubuntu-basiert mit Cinnamon/MATE/Xfce; nutzerfreundlich und LTS-orientiert.', logo: 'assets/img/distros/Linux Mint.png', videoUrl: 'https://youtu.be/PZZz790YnzU?si=gaXM44FeOhNQG7QS', pros: ['Cinnamon-Oberfläche vertraut für Windows-Umsteiger', 'Keine Snap-Pflicht, bevorzugt DEB und Flatpak', 'Multimedia-Codecs und Essentials direkt dabei'], cons: ['Konservative Paketbasis durch Ubuntu LTS', 'Keine Rolling- oder Enterprise-Variante verfügbar'] },
   { name: 'Pop!_OS', codebase: 'ubuntu', countries: ['us'], isoSizeMb: 3100, tags: ['gaming', 'programmierer', 'gutes-design', 'Laptop'], docsUrl: 'https://support.system76.com/', downloadUrl: 'https://pop.system76.com/', description: 'System76-Distribution mit Cosmic/GNOME, GPU-Optimierungen und Dev-/Creator-Fokus.', logo: 'assets/img/distros/Pop!_OS.png', videoUrl: 'https://youtu.be/oz6TjmCEAik?si=ioV-Yalc3_9UZOwb', pros: ['COSMIC-Workflow mit vielen Tastenkürzeln', 'Gute GPU- und Firmware-Tools inkl. Hybrid-Switching', 'Flatpak-freundliche Defaults für Dev und Creator'], cons: ['Kein aktuelles LTS-Release verfügbar', 'Stark auf GNOME/COSMIC zugeschnitten, wenige offizielle Spins'] },
   { name: 'Kali Linux', codebase: 'debian', countries: ['international'], isoSizeMb: 4400, tags: ['it-sicherheit', 'forensik', 'fuer-experten'], docsUrl: 'https://www.kali.org/docs/', downloadUrl: 'https://www.kali.org/get-kali/', description: 'Offensive-Security-Distribution mit umfangreichen Pen-Testing-Tools.', logo: 'assets/img/distros/Kali Linux.png', videoUrl: 'https://youtu.be/56VTPxJ0QEc?si=SHsBZJpwojFrA8Nj' },
   { name: 'Parrot Security', codebase: 'debian', countries: ['it'], isoSizeMb: 4300, tags: ['it-sicherheit', 'forensik', 'privacy'], docsUrl: 'https://www.parrotsec.org/docs/', downloadUrl: 'https://parrotsec.org/download/', description: 'Security- und Forensik-Distribution mit Fokus auf Privacy und leichte Images.', logo: 'assets/img/distros/Parrot Security.png', videoUrl: 'https://youtu.be/aT6tetm8_04?si=aS__kzmsw9u7vnGa' },
   { name: 'Tails', codebase: 'debian', countries: ['fr'], isoSizeMb: 1300, tags: ['privacy', 'it-sicherheit', 'barrierefreiheit'], docsUrl: 'https://tails.net/doc/index.en.html', downloadUrl: 'https://tails.net/install/index.en.html', description: 'Amnesische Live-Distribution für Anonymität über Tor; keine Spuren auf dem Host.', logo: 'assets/img/distros/Tails.png', videoUrl: 'https://youtu.be/gO9fTnMxwYw?si=nEHxz7ehSjqwtOHB' },
   { name: 'Debian', codebase: 'debian', countries: ['international'], isoSizeMb: 4700, tags: ['long-term-support', 'server', 'verwaltung'], docsUrl: 'https://www.debian.org/doc/', downloadUrl: 'https://www.debian.org/distrib/', description: 'Stabile Universal-Distribution mit großem Paket-Ökosystem.', logo: 'assets/img/distros/Debian.png', videoUrl: 'https://youtu.be/LW7Z892bsG4?si=eqcev5hlaVEn8JOL', pros: ['Sehr stabiler Release-Zyklus', 'Enormes Paketarchiv mit vielen Architekturen', 'Lange Sicherheitspflege durch Security-Team'], cons: ['Pakete sind oft älter als Upstream', 'Installer verlangt mehr manuelle Entscheidungen'] },
   { name: 'MX Linux', codebase: 'debian', countries: ['us'], isoSizeMb: 2200, tags: ['einsteigerfreundlich', 'lightweight', 'systemd-free', 'Laptop'], docsUrl: 'https://mxlinux.org/wiki/', downloadUrl: 'https://mxlinux.org/downloads/', description: 'Debian Stable mit Xfce/Fluxbox, systemd-frei und sehr einsteigerfreundlich.', logo: 'assets/img/distros/MX Linux.png', videoUrl: 'https://youtu.be/zEkunNpiIuI?si=C3im3MkOfQzPL1U8' },
   { name: 'Devuan', codebase: 'debian', countries: ['us'], isoSizeMb: 1700, tags: ['systemd-free', 'server', 'privacy'], docsUrl: 'https://wiki.devuan.org/', downloadUrl: 'https://www.devuan.org/get-devuan', description: 'Systemd-freier Debian-Fork mit Fokus auf Init-Wahlfreiheit.', logo: 'assets/img/distros/Devuan.png', videoUrl: 'https://youtu.be/nRdNes7fsuU?si=qZP35UMpwyBBTl5o' },
   { name: 'Arch Linux', codebase: 'arch', countries: ['international'], isoSizeMb: 1400, tags: ['rolling', 'fuer-experten', 'programmierer'], docsUrl: 'https://wiki.archlinux.org', downloadUrl: 'https://archlinux.org/download/', description: 'Minimal, rolling-release, mit hervorragender Dokumentation.', logo: 'assets/img/distros/Arch Linux.png', videoUrl: 'https://youtu.be/LiG2wMkcrFE?si=83Sk3QSxblFCYZMV', pros: ['Rolling Release mit sehr aktuellen Paketen', 'Ausführliche Dokumentation im Arch Wiki', 'Pacman und AUR bieten große Softwareauswahl'], cons: ['Manuelle Installation erfordert Erfahrung', 'Rolling Release benötigt regelmäßige Wartung'] },
   { name: 'EndeavourOS', codebase: 'arch', countries: ['nl'], isoSizeMb: 2300, tags: ['rolling', 'einsteigerfreundlich', 'programmierer', 'Laptop'], docsUrl: 'https://discovery.endeavouros.com', downloadUrl: 'https://endeavouros.com/latest-release/', description: 'Community-Arch-Spin mit schnellem Installer und Rolling-Updates.', logo: 'assets/img/distros/EndeavourOS.png', videoUrl: 'https://youtu.be/v-e9FheK5ZA?si=3lqrkKHPQWubt2TZ' },
   { name: 'Manjaro', codebase: 'arch', countries: ['de'], isoSizeMb: 4000, tags: ['rolling', 'gaming', 'einsteigerfreundlich', 'Laptop'], docsUrl: 'https://wiki.manjaro.org', downloadUrl: 'https://manjaro.org/download/', description: 'Arch-basiert mit vorgefertigten Desktops und grafischen Tools.', logo: 'assets/img/distros/Manjaro.png', videoUrl: 'https://youtu.be/lqRY8RGPsqg?si=JhMKvVfhzEycC8WZ', pros: ['Einfache Installation mit vorkonfigurierten Desktops', 'Eigene Stable- und Testing-Branches für kontrollierte Updates', 'AUR optional via Pamac nutzbar'], cons: ['Upstream-Updates im Stable-Branch verzögert', 'Kleinere Community als Arch oder Ubuntu'] },
   { name: 'Garuda Linux', codebase: 'arch', countries: ['in'], isoSizeMb: 4600, tags: ['gaming', 'gutes-design', 'rolling', 'Laptop'], docsUrl: 'https://garudalinux.org/docs', downloadUrl: 'https://garudalinux.org/downloads.html', description: 'Arch-basiert mit Btrfs-Snapshots, Gaming-Tuning und KDE-zentriertem Design.', logo: 'assets/img/distros/Garuda Linux.png', videoUrl: 'https://youtu.be/xVy7TBem_ZI?si=yfOtA890NA2bVLV-' },
   { name: 'AthenaOS', codebase: 'arch', countries: ['it'], isoSizeMb: 3400, tags: ['it-sicherheit', 'forensik', 'rolling'], docsUrl: 'https://athenaos.org/en/getting-started/athenaos/', downloadUrl: 'https://athenaos.org/en/getting-started/download/', description: 'Arch-basierte Security-Distribution mit forensischem Fokus.', logo: 'assets/img/distros/AthenaOS.png', videoUrl: 'https://youtu.be/j0xJ30WtsgA?si=4hqJ7QPPjOVv2W4M' },
   { name: 'Fedora Workstation', codebase: 'redhat', countries: ['us'], isoSizeMb: 2000, tags: ['programmierer', 'gutes-design', 'bildung', 'ki', 'Laptop'], docsUrl: 'https://docs.fedoraproject.org/en-US/quick-docs/', downloadUrl: 'https://fedoraproject.org/workstation/download', description: 'Upstream-nahes GNOME-Desktop-Erlebnis mit schnellen Releases.', logo: 'assets/img/distros/Fedora Workstation.png', videoUrl: 'https://youtu.be/Ivt5B5mgXTM?si=if9DGe81nabVA-4f', pros: ['Sehr aktuelle GNOME-Versionen und Kernel', 'Gute Entwickler-Toolchain und Toolbox/Container-Setup', 'Flatpak-Integration ist first class'], cons: ['Halbjährliche Releases erfordern häufigere Upgrades', 'Für einige Codecs wird RPM Fusion benötigt'] },
   { name: 'Fedora Server', codebase: 'redhat', countries: ['us'], isoSizeMb: 2000, tags: ['server', 'cloud', 'verwaltung'], docsUrl: 'https://docs.fedoraproject.org/en-US/fedora-server/', downloadUrl: 'https://getfedora.org/en/server/download/', description: 'Server-Edition mit Cockpit-Admin-Tools und kurzem Release-Zyklus.', logo: 'assets/img/distros/Fedora Server.png', videoUrl: 'https://youtu.be/kOEcTGZWiUQ?si=aECGK3tpdXsySwPM' },
   { name: 'Fedora Silverblue', codebase: 'redhat', countries: ['us'], isoSizeMb: 2900, tags: ['immutable', 'programmierer', 'privacy', 'Laptop'], docsUrl: 'https://docs.fedoraproject.org/en-US/fedora-silverblue/', downloadUrl: 'https://fedoraproject.org/silverblue/', description: 'Unveränderliches Fedora mit rpm-ostree und GNOME für stabile Desktops.', logo: 'assets/img/distros/Fedora Silverblue.png', videoUrl: 'https://youtu.be/q776zI6IKkc?si=NTklxHoIyL8MM0Hx' },
   { name: 'Nobara', codebase: 'redhat', countries: ['us'], isoSizeMb: 4400, tags: ['gaming', 'content-creation', 'einsteigerfreundlich', 'Laptop'], docsUrl: 'https://nobara.org/docs', downloadUrl: 'https://nobara.org/download', description: 'Gaming-/Creator-orientierter Fedora-Spin mit vorinstallierten Tweaks.', logo: 'assets/img/distros/Nobara.png', videoUrl: 'https://youtu.be/wcMpmgKbZ8o?si=p4NRS6yBeey39rDv' },
   { name: 'Bazzite', codebase: 'redhat', countries: ['us'], isoSizeMb: 4700, tags: ['gaming', 'immutable', 'einsteigerfreundlich'], docsUrl: 'https://docs.bazzite.gg/', downloadUrl: 'https://github.com/ublue-os/bazzite/releases', description: 'Fedora-Atomic-Variante optimiert für Gaming und Streaming (Universal Blue).', logo: 'assets/img/distros/Bazzite.png', videoUrl: 'https://youtu.be/MfAZea_qkBI?si=fg8WKfENGQRrYFrH' },
   { name: 'ChimeraOS', codebase: 'independent', countries: ['us'], isoSizeMb: 3300, tags: ['gaming', 'rolling', 'fuer-experten'], docsUrl: 'https://github.com/ChimeraOS/chimeraos/wiki', downloadUrl: 'https://chimeraos.org/download', description: 'Gaming-fokussierte Rolling-Distribution mit Steam-Big-Picture-Erlebnis.', logo: 'assets/img/distros/ChimeraOS.png', videoUrl: 'https://youtu.be/9nUCCcoqKag?si=8q-z-EXJV3XKlQcP' },
   { name: 'CachyOS', codebase: 'arch', countries: ['de'], isoSizeMb: 2400, tags: ['lightweight', 'gaming', 'gutes-design', 'Laptop'], docsUrl: 'https://wiki.cachyos.org', downloadUrl: 'https://cachyos.org/download/', description: 'Arch-basiert mit Performance-Optimierungen, ZFS/Btrfs-Optionen und Gaming-Fokus.', logo: 'assets/img/distros/CachyOS.png', videoUrl: 'https://youtu.be/6x5bs-c_03Y?si=Qll-CiFiWR6a7X_f' },
   { name: 'SteamOS', codebase: 'arch', countries: ['us'], isoSizeMb: 3500, tags: ['gaming', 'rolling', 'immutable'], docsUrl: 'https://help.steampowered.com/en/faqs/view/3F7F-2E2A-5D28-3E4F', downloadUrl: 'https://store.steampowered.com/steamos/download', description: 'Valve/Arch-basierte Gaming-Distribution für Steam Deck und PC, rolling/immutable.', logo: 'assets/img/distros/SteamOS.png', videoUrl: 'https://youtu.be/rCqkWIb4j6E?si=h6yajWCNalxSkIYM' },
   { name: 'openSUSE Tumbleweed', codebase: 'suse', countries: ['de'], isoSizeMb: 1500, tags: ['rolling', 'programmierer', 'forschung'], docsUrl: 'https://en.opensuse.org/Portal:Tumbleweed', downloadUrl: 'https://get.opensuse.org/tumbleweed/', description: 'Rolling-Release mit Snapper/Btrfs-Tools und YaST.', logo: 'assets/img/distros/OpenSUSE Tumbleweed.png', videoUrl: 'https://youtu.be/0T02xd9qVmM?si=tYHAEXG6H5QbtVzE' },
   { name: 'openSUSE Leap', codebase: 'suse', countries: ['de'], isoSizeMb: 4800, tags: ['long-term-support', 'office', 'verwaltung'], docsUrl: 'https://en.opensuse.org/Portal:Leap', downloadUrl: 'https://get.opensuse.org/leap/', description: 'Stabile SUSE-Basis mit YaST und Snapper.', logo: 'assets/img/distros/openSUSE Leap.png', videoUrl: 'https://youtu.be/T_1QyjCJCY8?si=aCfHP6kKT4hvfCHg' },
   { name: 'SLES', codebase: 'suse', countries: ['de'], isoSizeMb: 1200, tags: ['server', 'long-term-support', 'cloud'], docsUrl: 'https://documentation.suse.com/sles/', downloadUrl: 'https://www.suse.com/download/sles/', description: 'Enterprise-Distribution von SUSE mit langem Support und YaST-Tooling.', logo: 'assets/img/distros/SLES.png', videoUrl: 'https://youtu.be/66zw_YM2yY8?si=CCIZM2DhptF4JrF4' },
   { name: 'Gentoo', codebase: 'gentoo', countries: ['us'], isoSizeMb: 1000, tags: ['source-based', 'fuer-experten', 'lightweight'], docsUrl: 'https://wiki.gentoo.org', downloadUrl: 'https://www.gentoo.org/downloads/', description: 'Quellbasierte Metadistribution mit Portage-Paketverwaltung und maximaler Anpassung.', logo: 'assets/img/distros/Gentoo.png', videoUrl: 'https://youtu.be/OZDyH_vu5QM?si=KZsXhcBCT7WSv6Z2' },
   { name: 'Slackware', codebase: 'slackware', countries: ['us'], isoSizeMb: 3200, tags: ['fuer-experten', 'systemd-free', 'programmierer'], docsUrl: 'https://docs.slackware.com', downloadUrl: 'https://mirrors.slackware.com/slackware/', description: 'Älteste aktive Linux-Distribution mit KISS-Ansatz und klassischem BSD-Init.', logo: 'assets/img/distros/Slackware.png', videoUrl: 'https://youtu.be/vV_lDPFYbVg?si=dRq2bTSRJDUitkdC' },
   { name: 'VectorLinux', codebase: 'slackware', countries: ['ca'], isoSizeMb: 700, tags: ['lightweight', 'systemd-free', 'fuer-experten'], docsUrl: 'https://vectorlinux.com/', downloadUrl: 'https://sourceforge.net/projects/vectorlinux/files/', description: 'Slackware-basierte, schlanke Distribution; Fokus auf Geschwindigkeit und Einfachheit.', logo: 'assets/img/distros/VectorLinux.png', videoUrl: 'https://youtu.be/DzX3gAhyxHA?si=1SHCtmf1wwsrYN1G' },
   { name: 'Void Linux', codebase: 'independent', countries: ['es'], isoSizeMb: 900, tags: ['lightweight', 'systemd-free', 'rolling'], docsUrl: 'https://docs.voidlinux.org', downloadUrl: 'https://voidlinux.org/download/', description: 'Unabhängige Rolling-Distribution mit runit-Init und musl/glibc-Optionen.', logo: 'assets/img/distros/Void Linux.png', videoUrl: 'https://youtu.be/g0eikiFzows?si=CzO3NiHvRnsrKgxq' },
   { name: 'Nitrux', codebase: 'debian', countries: ['mx'], isoSizeMb: 2900, tags: ['gutes-design', 'einsteigerfreundlich', 'programmierer', 'Laptop'], docsUrl: 'https://nxos.org/faq/', downloadUrl: 'https://nxos.org/download/', description: 'Debian-basierte Desktop-Distribution mit Maui Shell/KDE und AppImage-Fokus.', logo: 'assets/img/distros/Nitrux.png', videoUrl: 'https://youtu.be/sOLGDITOws8?si=JGaTqdOK9YbyisXk' },
   { name: 'Zentyal Server', codebase: 'ubuntu', countries: ['es'], isoSizeMb: 1800, tags: ['server', 'verwaltung', 'cloud'], docsUrl: 'https://doc.zentyal.org', downloadUrl: 'https://zentyal.com/community/', description: 'Small-Business-Server auf Ubuntu-Basis mit AD/Samba-Integration.', logo: 'assets/img/distros/Zentyal Server.png', videoUrl: 'https://youtu.be/RZfybZVE6Lo?si=bI-ZbEX16dIqMoBg' },
   { name: 'AUSTRUMI', codebase: 'independent', countries: ['lv'], isoSizeMb: 700, tags: ['lightweight', 'datenrettung', 'einsteigerfreundlich'], docsUrl: 'https://austrumi.lv/', downloadUrl: 'https://sourceforge.net/projects/austrumi/files/', description: 'Leichtgewichtige lettische Live-Distribution für ältere Hardware und Rettungseinsätze.', logo: 'assets/img/distros/AUSTRUMI.png', videoUrl: 'https://youtu.be/wrJ0ALGixtE?si=SiYnbeXaOEswX84r' },
   { name: 'AryaLinux', codebase: 'independent', countries: ['in'], isoSizeMb: 2300, tags: ['programmierer', 'fuer-experten', 'source-based'], docsUrl: 'https://aryalinux.org/', downloadUrl: 'https://aryalinux.org/?page_id=36', description: 'Quellbasierte Distribution mit eigenem Build-System für erfahrene Nutzer.', logo: 'assets/img/distros/AryaLinux.png', videoUrl: 'https://youtu.be/8tefbIDEQC0?si=xR3GpnkDT3vWMCpR' },
   { name: 'MIRACLE LINUX', codebase: 'redhat', countries: ['jp'], isoSizeMb: 1300, tags: ['server', 'long-term-support', 'verwaltung'], docsUrl: 'https://www.cybertrust.co.jp/miracle-linux/', downloadUrl: 'https://www.cybertrust.co.jp/miracle-linux/', description: 'RHEL-kompatible Enterprise-Distribution aus Japan.', logo: 'assets/img/distros/MIRACLE LINUX.png', videoUrl: 'https://youtu.be/8cZmbkNdhfA?si=9Teg01FQH23laXbx' },
   { name: 'Regata OS', codebase: 'suse', countries: ['br'], isoSizeMb: 4300, tags: ['gaming', 'content-creation', 'gutes-design', 'Laptop'], docsUrl: 'https://www.regataos.com.br/', downloadUrl: 'https://www.regataos.com.br/', description: 'openSUSE-basierte Desktop-Distribution mit Gaming-Tools und Multimedia-Fokus.', logo: 'assets/img/distros/Regata OS.png', videoUrl: 'https://youtu.be/kT1YS0xVWCk?si=PuV46YUBsXycsfNt' },
   { name: 'NethServer', codebase: 'redhat', countries: ['it'], isoSizeMb: 1200, tags: ['server', 'verwaltung', 'cloud'], docsUrl: 'https://docs.nethserver.org', downloadUrl: 'https://www.nethserver.org/download', description: 'Modularer Small-Business-Server (ehemals CentOS/RHEL-basiert).', logo: 'assets/img/distros/NethServer.png', videoUrl: 'https://youtu.be/XT6t0f5sz5Q?si=7aEcqKuqkUd8ryBA' },
   { name: 'openmamba', codebase: 'independent', countries: ['it'], isoSizeMb: 2500, tags: ['office', 'einsteigerfreundlich', 'gutes-design', 'Laptop'], docsUrl: 'https://wiki.openmamba.org', downloadUrl: 'https://openmamba.org/en/download/', description: 'Italienische Rolling-Distribution mit hauseigenem Paket-Ökosystem.', logo: 'assets/img/distros/openmamba.png', videoUrl: 'https://youtu.be/f6wkO3dqzvk?si=SNZC3pW3CLgWReAh' },
   { name: 'NimbleX', codebase: 'slackware', countries: ['ro'], isoSizeMb: 1200, tags: ['lightweight', 'datenrettung', 'systemd-free'], docsUrl: 'https://nimblex.net/', downloadUrl: 'https://nimblex.net/', description: 'Slackware-basierte Live-Distribution, optimiert für schnelle Einsätze und Rettung.', logo: 'assets/img/distros/NimbleX.png', videoUrl: 'https://youtu.be/CcBiBeoOnjw?si=iYn7WeUpOIPVxk9a' },
   { name: 'NuTyX', codebase: 'independent', countries: ['ch'], isoSizeMb: 1500, tags: ['rolling', 'source-based', 'fuer-experten'], docsUrl: 'https://www.nutyx.org/en/documentation', downloadUrl: 'https://www.nutyx.org/en/downloads', description: 'Unabhängige Rolling-Distribution mit cards-Paketmanager und Quelle-basiertem Ansatz.', logo: 'assets/img/distros/NuTyX.png', videoUrl: 'https://youtu.be/jEBXC9pESHc?si=OleeyTvwONQzNHsy' },
   { name: 'LliureX', codebase: 'ubuntu', countries: ['es'], isoSizeMb: 3900, tags: ['bildung', 'office', 'einsteigerfreundlich', 'Laptop'], docsUrl: 'https://portal.edu.gva.es/lliurex/', downloadUrl: 'https://portal.edu.gva.es/lliurex/va/descarga/', description: 'Bildungsdistribution der Generalitat Valenciana, Ubuntu-basiert.', logo: 'assets/img/distros/LliureX.png', videoUrl: 'https://youtu.be/_LcIa4AMDNE?si=WpOzlEu0jaA_xNIs' },
   { name: 'SparkyLinux', codebase: 'debian', countries: ['pl'], isoSizeMb: 2100, tags: ['lightweight', 'rolling', 'einsteigerfreundlich', 'Laptop'], docsUrl: 'https://wiki.sparkylinux.org/', downloadUrl: 'https://sparkylinux.org/download/', description: 'Debian-basiertes Rolling-System, leichtgewichtig mit vorgefertigten Desktops.', logo: 'assets/img/distros/SparkyLinux.png', videoUrl: 'https://youtu.be/vijEGZwA-ts?si=T9UBxhf0i-ORn1w-' },
   { name: 'Canaima', codebase: 'debian', countries: ['ve'], isoSizeMb: 2800, tags: ['bildung', 'office', 'verwaltung', 'Laptop'], docsUrl: 'https://wiki.canaima.softwarelibre.gob.ve', downloadUrl: 'https://canaima.softwarelibre.gob.ve/descarga/', description: 'Venezolanische Debian-basierte Distribution für Bildung und Verwaltung.', logo: 'assets/img/distros/Canaima.png', videoUrl: 'https://youtu.be/D9NSelZ3R3c?si=q65fozj9OWKjVjmt' },
   { name: 'ExTiX', codebase: 'ubuntu', countries: ['se'], isoSizeMb: 3600, tags: ['rolling', 'fuer-experten', 'programmierer', 'Laptop'], docsUrl: 'https://www.extix.se', downloadUrl: 'https://sourceforge.net/projects/extix/files/', description: 'Schwedische Ubuntu/Deepin-basierte Rolling-Distribution mit häufigen Releases.', logo: 'assets/img/distros/ExTiX.png', videoUrl: 'https://youtu.be/jX-SRcg2AmA?si=WfH5EqV6nOhFXGos' },
   { name: 'endeavouros-arm', codebase: 'arch', countries: ['nl'], isoSizeMb: 2400, tags: ['rolling', 'programmierer', 'fuer-experten'], docsUrl: 'https://discovery.endeavouros.com/arm/', downloadUrl: 'https://discovery.endeavouros.com/arm/', description: 'EndeavourOS-Variante für ARM-Boards mit schnellem Installer und Rolling-Updates.', logo: 'assets/img/distros/endeavouros-arm.png', videoUrl: 'https://youtu.be/Y2mFeuVMagA?si=GYSleEmIUYSkKrKr' },
   { name: 'NixOS', codebase: 'independent', countries: ['nl'], isoSizeMb: 1600, tags: ['programmierer', 'cloud', 'forschung', 'ki'], docsUrl: 'https://nixos.org/learn.html', downloadUrl: 'https://nixos.org/download', description: 'Deklaratives System mit atomaren Rollbacks über den Nix-Paketmanager.', logo: 'assets/img/distros/NixOS.png', videoUrl: 'https://youtu.be/PSfc-S2z89o?si=5NyZiKwX2sz_oiJE' },
   { name: 'Qubes OS', codebase: 'independent', countries: ['international'], isoSizeMb: 5000, tags: ['it-sicherheit', 'privacy', 'fuer-experten'], docsUrl: 'https://www.qubes-os.org/doc/', downloadUrl: 'https://www.qubes-os.org/downloads/', description: 'Sicherheitsfokussiertes OS mit Isolation über Xen-VMs (Security by Compartmentalization).', logo: 'assets/img/distros/Qubes OS.png', videoUrl: 'https://youtu.be/Aghj8MyDF4I?si=z3sia0fOdeCq7eRr' },
   { name: 'KDE neon', codebase: 'ubuntu', countries: ['de'], isoSizeMb: 3000, tags: ['gutes-design', 'office', 'einsteigerfreundlich', 'Laptop'], docsUrl: 'https://neon.kde.org/faq', downloadUrl: 'https://neon.kde.org/download', description: 'KDEs Referenz-Desktop mit aktuellen Plasma-Versionen auf Ubuntu-Basis.', logo: 'assets/img/distros/KDE neon.png', videoUrl: 'https://youtu.be/b1V_bVRLUjE?si=eq1eOHBitdH1n1rU' },
   { name: 'Elementary OS', codebase: 'ubuntu', countries: ['us'], isoSizeMb: 2900, tags: ['gutes-design', 'einsteigerfreundlich', 'office', 'Laptop'], docsUrl: 'https://support.elementary.io', downloadUrl: 'https://elementary.io/', description: 'Designorientierte Ubuntu-Variante mit Pantheon-Desktop.', logo: 'assets/img/distros/Elementary OS.png', videoUrl: 'https://youtu.be/3KoCDt4fxcM?si=rg_QmMMHykV0GJqA' },
   { name: 'Zorin OS', codebase: 'ubuntu', countries: ['ie'], isoSizeMb: 3300, tags: ['barrierefreiheit', 'einsteigerfreundlich', 'office', 'Laptop'], docsUrl: 'https://help.zorin.com', downloadUrl: 'https://zorin.com/os/download/', description: 'Windows-ähnliche Oberfläche für Umsteiger, basierend auf Ubuntu.', logo: 'assets/img/distros/Zorin OS.png', videoUrl: 'https://youtu.be/zEIvVpgPsco?si=Aj5WHCfDmt6QIXlG' },
   { name: 'Rescatux', codebase: 'debian', countries: ['es'], isoSizeMb: 800, tags: ['datenrettung', 'disk-management', 'einsteigerfreundlich'], docsUrl: 'https://www.rescatux.org', downloadUrl: 'https://www.rescatux.org/download/', description: 'Live-Tool zum Reparieren von Bootloadern, Passwörtern und Dateisystemen.', logo: 'assets/img/distros/Rescatux.png', videoUrl: 'https://youtu.be/vqlgAVyRaqs?si=znlCdjb6zC_l8C9b' },
   { name: 'SystemRescue', codebase: 'independent', countries: ['fr'], isoSizeMb: 900, tags: ['datenrettung', 'disk-management', 'forensik'], docsUrl: 'https://www.system-rescue.org/manual/', downloadUrl: 'https://www.system-rescue.org/Download/', description: 'Live-Rescue-System mit Schwerpunkt auf Backup, Recovery und Forensik.', logo: 'assets/img/distros/SystemRescue.png', videoUrl: 'https://youtu.be/tufxo0JljxY?si=GbsnTuAF1gdUrZSJ' },
   { name: 'Clonezilla Live', codebase: 'debian', countries: ['tw'], isoSizeMb: 4200, tags: ['datenrettung', 'disk-management', 'verwaltung'], docsUrl: 'https://clonezilla.org/clonezilla-live.php', downloadUrl: 'https://clonezilla.org/downloads.php', description: 'Live-Umgebung für Backup, Imaging und Klonen von Systemen.', logo: 'assets/img/distros/Clonezilla Live.png', videoUrl: 'https://youtu.be/UTQKAbn2Wis?si=SR0rfjLwSK9I5say' },
   { name: 'Trisquel', codebase: 'ubuntu', countries: ['es'], isoSizeMb: 2700, tags: ['privacy', 'bildung', 'barrierefreiheit', 'Laptop'], docsUrl: 'https://trisquel.info/en/wiki', downloadUrl: 'https://trisquel.info/en/download', description: 'FSF-akkreditierte, vollständig freie Ubuntu-basierte Distribution.', logo: 'assets/img/distros/Trisquel.png', videoUrl: 'https://youtu.be/wJ_ZQ_JAN_I?si=ebyPS-E5dPXTuFL9' },
   { name: 'TUXEDO OS', codebase: 'ubuntu', countries: ['de'], isoSizeMb: 3200, tags: ['gutes-design', 'einsteigerfreundlich', 'office', 'Laptop'], docsUrl: 'https://en.tuxedolinux.com/', downloadUrl: 'https://en.tuxedolinux.com/', description: 'Deutsche Ubuntu-basierte Distribution, optimiert für TUXEDO-Laptops und Entwickler-Systeme.', logo: 'assets/img/distros/TUXEDO OS.png', videoUrl: 'https://youtu.be/jBfY5gHB2T8?si=JIJSSwPcJOnzS8oR', pros: ['Perfekte Hardware-Integration mit TUXEDO-Systemen', 'Deutsche Localization und Support', 'Schöne Oberfläche mit guten Defaults'], cons: ['Optimiert hauptsächlich für TUXEDO-Hardware', 'Kleinere Community als Ubuntu'] },
   { name: 'Puppy Linux', codebase: 'independent', countries: ['au'], isoSizeMb: 700, tags: ['lightweight', 'datenrettung', 'einsteigerfreundlich'], docsUrl: 'https://puppylinux.com/', downloadUrl: 'https://puppylinux.com/download.html', description: 'Ultraleichte Live-Distribution für ältere Hardware und portable Einsätze.', logo: 'assets/img/distros/Puppy Linux.png', videoUrl: 'https://youtu.be/jvWUSnzBKyo?si=YBrnRo3_Q7Oy9l4o' },
   { name: 'Oracle Linux', codebase: 'redhat', countries: ['us'], isoSizeMb: 1200, tags: ['cloud', 'server', 'verwaltung'], docsUrl: 'https://docs.oracle.com/en/operating-systems/oracle-linux/', downloadUrl: 'https://yum.oracle.com/oracle-linux-isos.html', description: 'RHEL-kompatible Enterprise-Distribution mit Oracle-Supportoptionen.', logo: 'assets/img/distros/Oracle Linux.png', videoUrl: 'https://youtu.be/NkrH0Kw0HaU?si=SfkhRpblf5zvo5D6' },
   { name: 'Photon OS', codebase: 'independent', countries: ['us'], isoSizeMb: 1000, tags: ['cloud', 'server', 'lightweight'], docsUrl: 'https://vmware.github.io/photon/', downloadUrl: 'https://vmware.github.io/photon/', description: 'VMware-optimierte, minimalistische Container- und Cloud-Distribution.', logo: 'assets/img/distros/Photon OS.png', videoUrl: 'https://youtu.be/vVJnGI-WPrg?si=LaEwPSFaR7sNbwfE' },
   { name: 'Ubuntu Server', codebase: 'ubuntu', countries: ['uk'], isoSizeMb: 1800, tags: ['server', 'cloud', 'long-term-support'], docsUrl: 'https://ubuntu.com/server/docs', downloadUrl: 'https://ubuntu.com/download/server', description: 'LTS-orientierte Server-Edition mit breitem Paket- und Cloud-Ökosystem.', logo: 'assets/img/distros/Ubuntu Server.png', videoUrl: 'https://youtu.be/n7aEcfDNULc?si=t7caztj4o056Zraf' },
   { name: 'Fedora Kinoite', codebase: 'redhat', countries: ['us'], isoSizeMb: 2900, tags: ['immutable', 'gutes-design', 'programmierer'], docsUrl: 'https://docs.fedoraproject.org/en-US/fedora-kinoite/', downloadUrl: 'https://fedoraproject.org/kinoite/', description: 'Unveränderliche Fedora-Variante mit KDE Plasma und rpm-ostree.', logo: 'assets/img/distros/Fedora Kinoite.png', videoUrl: 'https://youtu.be/gWuby3e1hjY?si=4TpcgZpfhtDV17Ie' },
   { name: 'Bodhi Linux', codebase: 'ubuntu', countries: ['us'], isoSizeMb: 900, tags: ['lightweight', 'einsteigerfreundlich', 'bildung', 'Laptop'], docsUrl: 'https://www.bodhilinux.com/w/wiki/', downloadUrl: 'https://www.bodhilinux.com/download/', description: 'Ubuntu-basiert mit Moksha-Desktop; sehr ressourcenschonend und anpassbar.', logo: 'assets/img/distros/Bodhi Linux.png', videoUrl: 'https://youtu.be/GhIzMUjbals?si=2dLTN_2ITInTeTbr' },
   { name: 'Edubuntu', codebase: 'ubuntu', countries: ['uk'], isoSizeMb: 4200, tags: ['bildung', 'einsteigerfreundlich', 'office', 'Laptop'], docsUrl: 'https://edubuntu.org/', downloadUrl: 'https://edubuntu.org/download', description: 'Ubuntu-Variante mit vorinstallierten Bildungs- und Klassenraumtools.', logo: 'assets/img/distros/Edubuntu.png', videoUrl: 'https://youtu.be/iQ_aPKJk__k?si=AE6kDVKaZo1PSjuq' },
   { name: 'Clear Linux', codebase: 'independent', countries: ['us'], isoSizeMb: 1200, tags: ['fuer-experten', 'cloud', 'programmierer'], docsUrl: 'https://www.clearlinux.org/documentation', downloadUrl: 'https://www.clearlinux.org/downloads', description: 'Intel-optimierte Performance-Distribution mit Fokus auf Cloud/Workstation.', logo: 'assets/img/distros/Clear Linux.png', videoUrl: 'https://youtu.be/Z4mI9rTsk9g?si=DIR3rMkTsfDXALBO' },
   { name: 'RHEL', codebase: 'redhat', countries: ['us'], isoSizeMb: 1300, tags: ['server', 'long-term-support', 'verwaltung'], docsUrl: 'https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux', downloadUrl: 'https://access.redhat.com/products/red-hat-enterprise-linux/evaluation', description: 'Enterprise-Distribution mit zertifiziertem Support und langem Lebenszyklus.', logo: 'assets/img/distros/RHEL.png', videoUrl: 'https://youtu.be/RvaGM3ZJTvU?si=xCdvqMXi695uhS6m' },
   { name: 'Alpine Linux', codebase: 'independent', countries: ['us'], isoSizeMb: 700, tags: ['lightweight', 'server', 'it-sicherheit'], docsUrl: 'https://docs.alpinelinux.org', downloadUrl: 'https://alpinelinux.org/downloads/', description: 'Musl-/BusyBox-basierte Minimal-Distribution, beliebt für Container und Server.', logo: 'assets/img/distros/Alpine Linux.png', videoUrl: 'https://youtu.be/NKggFBdee94?si=txReivLxz1R6rFDn' }
]

// Fallback-Vor- und Nachteile für Distros, die noch keine pros/cons im Hauptdatensatz haben
const DISTRO_PROS_CONS = {
   'Ubuntu Studio': {
      pros: ['Audio/Video/Grafik-Tools vorinstalliert', 'Ubuntu-LTS-Basis für Stabilität'],
      cons: ['Großes ISO, braucht mehr Speicher', 'Mehr RAM-Verbrauch durch Kreativ-Stack']
   },
   'Xubuntu': {
      pros: ['Sehr leichtgewichtiges Xfce', 'Stabile Ubuntu-Basis mit LTS-Option'],
      cons: ['Weniger Eye-Candy als KDE/GNOME', 'Standard-Apps wirken schlicht']
   },
   'Lubuntu': {
      pros: ['LXQt ist extrem ressourcenschonend', 'Gut für sehr alte Hardware'],
      cons: ['Weniger Komfort-Features als große Desktops', 'Kleinere Auswahl an LXQt-Tools']
   },
   'Kali Linux': {
      pros: ['Umfangreiche Pentesting-Toolchains', 'Rolling mit schnellen Paket-Updates'],
      cons: ['Nicht für Alltags-Desktop gedacht', 'Kann Hardware/Netzwerkrestriktionen triggern']
   },
   'Parrot Security': {
      pros: ['Security/Privacy-Fokus mit vorkonfigurierten Tools', 'Leichter als viele Pentesting-Distros'],
      cons: ['Kleinere Community als Kali', 'Rolling kann gelegentlich instabil sein']
   },
   'Tails': {
      pros: ['Amnesisches System, speichert nichts lokal', 'Tor-by-default für hohe Privatsphäre'],
      cons: ['Bewusst langsamer wegen Tor-Routing', 'Persistenz nur optional und begrenzt']
   },
   'MX Linux': {
      pros: ['Einsteigerfreundlich trotz Debian Stable', 'Systemd-frei-Option und eigene MX-Tools'],
      cons: ['Pakete oft älter als Upstream', 'UI wirkt teils konservativ']
   },
   'Devuan': {
      pros: ['Debian ohne systemd', 'Stabile Basis mit Init-Wahl'],
      cons: ['Kleinere Community/Repo-Auswahl', 'Manchmal weniger Pakete verfügbar']
   },
   'EndeavourOS': {
      pros: ['Einfacher Einstieg in Arch dank Installer', 'Rolling, relativ nah an Upstream'],
      cons: ['Rolling erfordert Pflege und Updates', 'Kleinere Community als Ubuntu/Debian']
   },
   'Garuda Linux': {
      pros: ['Gaming-Tuning und Btrfs-Snapshots out of the box', 'Optisch starkes KDE-Setup'],
      cons: ['Höherer Ressourcenbedarf', 'Aggressive Tweaks können Fehler erzeugen']
   },
   'AthenaOS': {
      pros: ['Security/Forensik-Tools vorkonfiguriert', 'Arch-rolling für aktuelle Pakete'],
      cons: ['Nichts für Einsteiger', 'Dokumentation kleiner']
   },
   'Fedora Server': {
      pros: ['Cockpit-Webverwaltung inklusive', 'Aktuelle Kernel und SELinux standard'],
      cons: ['Kurzer Support-Zyklus, häufige Upgrades nötig', 'Weniger Third-Party-Pakete als Debian/Ubuntu']
   },
   'Fedora Silverblue': {
      pros: ['Immutable rpm-ostree mit atomaren Rollbacks', 'Flatpak-first für Desktop-Apps'],
      cons: ['Layering/Custom Kernel aufwendiger', 'Manche Workflows erfordern Toolbox/Container']
   },
   'Nobara': {
      pros: ['Gaming-/Creator-Tweaks ab Werk', 'Codecs und QoL-Patches schon integriert'],
      cons: ['Kleine Maintainer-Gruppe', 'Updates hängen von wenigen Personen ab']
   },
   'Bazzite': {
      pros: ['Optimiert für Gaming/Steam Deck', 'Immutable Fedora Atomic Basis'],
      cons: ['Benötigt mehr Plattenplatz', 'Abhängig von uBlue-Projekt für Images']
   },
   'ChimeraOS': {
      pros: ['Living-Room/Steam-Big-Picture Fokus', 'Automatisierte Updates und Gamepad-UX'],
      cons: ['Stark auf Gaming beschränkt', 'Wenig Desktop-Produktivitätstools']
   },
   'CachyOS': {
      pros: ['Performance-optimierte Kernel und Compiler-Flags', 'Installer erleichtert Arch-Setup'],
      cons: ['Rolling mit vielen Eigen-Tweaks', 'Kleinere Community']
   },
   'SteamOS': {
      pros: ['Optimiert für Steam Deck/Game Mode', 'Gute Controller-/HTPC-Erfahrung'],
      cons: ['Desktop-Nutzung eingeschränkt', 'Updates primär Deck-getrieben']
   },
   'openSUSE Tumbleweed': {
      pros: ['Rolling mit Snapper/Btrfs-Snapshots', 'YaST als starke Admin-Suite'],
      cons: ['Regelmäßige Upgrades nötig', 'Snapshots brauchen zusätzlichen Speicher']
   },
   'openSUSE Leap': {
      pros: ['Stabile Basis mit SUSE-Tools', 'YaST und Snapper inklusive'],
      cons: ['Pakete konservativer/älter', 'Größere Upgrades zwischen Releases']
   },
   'SLES': {
      pros: ['Enterprise-Support und Zertifizierungen', 'AutoYaST/YaST für Deployment'],
      cons: ['Lizenzkosten', 'Sehr konservative Paketstände']
   },
   'Gentoo': {
      pros: ['Maximale Anpassung via USE-Flags', 'Feinjustierte Performance möglich'],
      cons: ['Hoher Build-/Wartungsaufwand', 'Steile Lernkurve']
   },
   'Slackware': {
      pros: ['KISS-Ansatz, sehr stabil', 'Systemd-frei, klassische Unix-Struktur'],
      cons: ['Mehr Handarbeit bei Paketen/Deps', 'Langsamere Paketupdates']
   },
   'VectorLinux': {
      pros: ['Slackware-basiert und leichtgewichtig', 'Läuft gut auf älterer Hardware'],
      cons: ['Kleine Community und Repos', 'Weniger häufige Updates']
   },
   'Void Linux': {
      pros: ['runit-Init startet sehr schnell', 'Rolling mit musl-Option'],
      cons: ['Kleineres Paket-Repo', 'Weniger Komfort-Tools out of the box']
   },
   'Nitrux': {
      pros: ['AppImage-first Ansatz', 'Maui Shell/KDE-Design'],
      cons: ['Kleinere Community', 'Eigenes Repo/Release-Modell erfordert Vertrauen']
   },
   'Zentyal Server': {
      pros: ['AD/Samba-Integration vorkonfiguriert', 'Web-UI für häufige Admin-Aufgaben'],
      cons: ['Schlankes Ökosystem', 'Weniger generische Pakete als pures Ubuntu']
   },
   'AUSTRUMI': {
      pros: ['Extrem leichtgewichtiges Live-System', 'Gut für sehr alte Hardware'],
      cons: ['Sehr kleine Community', 'Begrenzte Paketauswahl']
   },
   'AryaLinux': {
      pros: ['Source-based, lehrreich', 'Eigenes Build-System gibt Kontrolle'],
      cons: ['Hoher Installationsaufwand', 'Kleine Nutzerbasis']
   },
   'MIRACLE LINUX': {
      pros: ['RHEL-kompatibel für Enterprise', 'Japanischer Unternehmenssupport'],
      cons: ['Dokumentation oft japanisch', 'Kleine Community']
   },
   'Regata OS': {
      pros: ['Gaming- und Multimedia-Tools vorinstalliert', 'openSUSE-Basis'],
      cons: ['Kleinere Community', 'Weniger Doku außerhalb Portugiesisch/Englisch']
   },
   'NethServer': {
      pros: ['Modulare Server-Module mit Web-UI', 'AD/Backup/Groupware schnell aktivierbar'],
      cons: ['Kleinere Community', 'Historischer CentOS-Shift sorgt für Umstellungen']
   },
   'openmamba': {
      pros: ['Rolling, KDE-orientiert', 'Eigenes Repo mit Kuratierung'],
      cons: ['Kleine Nutzerbasis', 'Weniger englische Dokumentation']
   },
   'NimbleX': {
      pros: ['Sehr kleines Live-System', 'Gut für Rescue oder alte PCs'],
      cons: ['Begrenzte Paketauswahl', 'Kleines Team, seltene Releases']
   },
   'NuTyX': {
      pros: ['cards-Paketmanager, rolling', 'Schlank und anpassbar'],
      cons: ['Kleine Community', 'Doku überschaubar']
   },
   'LliureX': {
      pros: ['Bildungs-Stack out of the box', 'Stabile Ubuntu-Basis'],
      cons: ['Stark auf Bildungs-Usecases fokussiert', 'Doku vor allem auf Spanisch/Katalanisch']
   },
   'SparkyLinux': {
      pros: ['Debian-basiert und leichtgewichtig', 'Semi-rolling/rolling Varianten verfügbar'],
      cons: ['Häufigere Updates einplanen', 'Kleinere Community']
   },
   'Canaima': {
      pros: ['Fokus auf Bildung/Verwaltung', 'Spanischsprachige Materialien'],
      cons: ['Regionaler Fokus, weniger globaler Support', 'Ältere Paketstände (Debian-basiert)']
   },
   'ExTiX': {
      pros: ['Häufige Releases, viele Desktop-Spins', 'Rolling-Charakter'],
      cons: ['Kann instabiler sein', 'Kleines Team']
   },
   'endeavouros-arm': {
      pros: ['Arch-Erlebnis auf ARM mit Installer', 'Community-Images'],
      cons: ['Hardware-Support je Board unterschiedlich', 'Rolling erfordert Pflege']
   },
   'NixOS': {
      pros: ['Deklarative Konfiguration, reproduzierbar', 'Atomare Rollbacks mit Generationen'],
      cons: ['Nix-Syntax Lernkurve', 'Ungewohnte Pfad-/Store-Logik']
   },
   'Qubes OS': {
      pros: ['Starke Isolation via Xen-VMs', 'Security by compartmentalization'],
      cons: ['Hohe Hardware-Anforderungen', 'Komplexes VM-Management']
   },
   'KDE neon': {
      pros: ['Immer aktuelles KDE Plasma', 'Ubuntu LTS als Basis'],
      cons: ['Manchmal App/Qt-Version-Mismatches', 'GNOME-/GTK-Apps teils älter']
   },
   'Elementary OS': {
      pros: ['Klares, konsistentes Design', 'Kuratiertes AppCenter'],
      cons: ['Weniger Anpassungsmöglichkeiten', 'Kleineres App-Ökosystem']
   },
   'Zorin OS': {
      pros: ['Windows-ähnliches UX für Umsteiger', 'Gute Defaults und Codecs'],
      cons: ['Manche Features in Pro-Edition', 'Updates leicht verzögert vs. Upstream']
   },
   'Rescatux': {
      pros: ['GUI-Assistenten für Bootloader/Passwort-Reparatur', 'Live-System schnell startklar'],
      cons: ['Nischen-Usecase', 'Seltenere Releases']
   },
   'SystemRescue': {
      pros: ['Umfangreiches Rescue-Toolkit', 'Stabil und CLI-fokussiert'],
      cons: ['Kaum GUI-Komfort', 'Live-Einsatz ohne Installer']
   },
   'Clonezilla Live': {
      pros: ['Sehr schnelles Imaging/Klonen', 'Effizient bei großen Datenträgern'],
      cons: ['Textbasierte UI', 'Kein paralleles Multi-Imaging im UI']
   },
   'Trisquel': {
      pros: ['100% freie Software, FSF-konform', 'Ubuntu-LTS-Basis'],
      cons: ['Keine proprietären Treiber/Codecs', 'Kleinere Repos/Hardware-Unterstützung']
   },
   'TUXEDO OS': {
      pros: ['Perfekte Hardware-Integration mit TUXEDO-Systemen', 'Deutsche Localization und Support', 'Schöne Oberfläche mit guten Defaults'],
      cons: ['Optimiert hauptsächlich für TUXEDO-Hardware', 'Kleinere Community als Ubuntu']
   },
   'Puppy Linux': {
      pros: ['Ultraleicht, läuft komplett im RAM', 'Ideal für sehr alte Rechner/USB'],
      cons: ['Altmodisches UI', 'Persistenz/Savefile-Handling nötig']
   },
   'Oracle Linux': {
      pros: ['RHEL-kompatibel, Ksplice Kernel-Livepatch', 'Stabil für Oracle-Stack'],
      cons: ['Enterprise-Support ggf. kostenpflichtig', 'Community kleiner als Alma/Rocky'],
   },
   'Photon OS': {
      pros: ['VMware- und Container-optimiert', 'Sehr kleines, schnelles Base-Image'],
      cons: ['Primär für Container/VMs, Desktop ungeeignet', 'Schlankes Repo'],
   },
   'Ubuntu Server': {
      pros: ['Großes Ökosystem, LTS-Support', 'Cloud-Images und Snap/apt Auswahl'],
      cons: ['Snap-Services teils unerwünscht', 'HWE/Kernel-Wahl erfordert Aufmerksamkeit'],
   },
   'Fedora Kinoite': {
      pros: ['Immutable KDE-Variante mit rpm-ostree', 'Sehr aktuelle Pakete'],
      cons: ['Layering/Codec/Nvidia-Setup aufwendiger', 'Kleiner als Fedora Workstation Community'],
   },
   'Bodhi Linux': {
      pros: ['Moksha-Desktop extrem leicht', 'Minimal und anpassbar'],
      cons: ['Kleine Community', 'Wenig vorinstallierte Apps'],
   },
   'Edubuntu': {
      pros: ['Bildungs-/Klassenraum-Pakete vorkonfiguriert', 'Ubuntu-LTS-Basis'],
      cons: ['Großer Footprint', 'Fokus eng auf Bildung'],
   },
   'Clear Linux': {
      pros: ['Intel-optimierte Performance', 'Stark für Cloud/Container Benchmarks'],
      cons: ['Nicht alle Desktop-Pakete verfügbar', 'Minimaler Desktop-Comfort'],
   },
   'RHEL': {
      pros: ['Enterprise-Support und Zertifizierungen', 'Langer Lebenszyklus/SLAs'],
      cons: ['Lizenzkosten', 'Konservative Paketversionen'],
   },
   'Alpine Linux': {
      pros: ['Sehr kleines musl/BusyBox-Base', 'Sicherheitsfokus, beliebt für Container'],
      cons: ['musl-Inkompatibilitäten möglich', 'Desktop-UX minimal'],
   }
}

// Fehlende pros/cons direkt in den Datensätzen ergänzen
DISTRO_FINDER_DATA.forEach((distro) => {
   const fallback = DISTRO_PROS_CONS[distro.name]

   if (fallback) {
      if (!distro.pros && fallback.pros) {
         distro.pros = fallback.pros
      }
      if (!distro.cons && fallback.cons) {
         distro.cons = fallback.cons
      }
   }
})

let searchDebounceTimer = null
let isFinderMode = false
let finderSelectedCountries = []
let finderCountryPickerState = []

function shouldAutoFocusSearchInputs() {
   if (typeof window === 'undefined') return false
   const isNarrowViewport = window.matchMedia('(max-width: 1023px)').matches
   const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
   return !(isNarrowViewport || hasCoarsePointer)
}

function getFinderCountryFlagIcon(countryCode) {
   const flagCodeMap = {
      uk: 'gb',
      el: 'gr'
   }
   const flagIconCode = flagCodeMap[countryCode] || countryCode
   return `<span class="fi fi-${flagIconCode} finder-country-picker__flag" aria-hidden="true"></span>`
}

function renderFinderCountrySummary() {
   if (!finderFilterCountryValue || !finderFilterCountrySubvalue) return

   const selectedLabels = finderSelectedCountries
      .map((countryCode) => FINDER_COUNTRY_LABEL_BY_VALUE[countryCode])
      .filter(Boolean)

   finderFilterCountryValue.textContent = selectedLabels.length
      ? `${selectedLabels.length} ${selectedLabels.length === 1 ? 'Land' : 'Länder'} ausgewählt`
      : 'Alle Länder'
   finderFilterCountrySubvalue.textContent = selectedLabels.length
      ? selectedLabels.join(', ')
      : 'Keine Länder ausgewählt'
}

function renderFinderCountryPickerCountries() {
   if (!finderCountryPickerCountries) return

   finderCountryPickerCountries.innerHTML = ''
   FINDER_COUNTRY_OPTIONS.forEach((country) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'belief-picker__religion finder-country-picker__country'
      button.dataset.value = country.value
      button.innerHTML = `${getFinderCountryFlagIcon(country.value)}<span>${country.label}</span>`

      if (finderCountryPickerState.includes(country.value)) {
         button.classList.add('is-selected')
      }

      button.addEventListener('click', () => {
         if (finderCountryPickerState.includes(country.value)) {
            finderCountryPickerState = finderCountryPickerState.filter((entry) => entry !== country.value)
         } else {
            finderCountryPickerState = [...finderCountryPickerState, country.value]
         }

         renderFinderCountryPickerCountries()
      })

      finderCountryPickerCountries.appendChild(button)
   })
}

function openFinderCountryModal() {
   finderCountryPickerState = [...finderSelectedCountries]
   renderFinderCountryPickerCountries()
   finderCountryModal?.classList.add('show-login')
}

function updateSearchFormIcon(iconClassName = 'fi fi-rc-search') {
   if (!searchFormIcon) return
   searchFormIcon.className = `${iconClassName} search__icon`
}

function applyFinderCountrySelection() {
   finderSelectedCountries = [...finderCountryPickerState]
   renderFinderCountrySummary()
   finderCountryModal?.classList.remove('show-login')
}

searchBtn.addEventListener('click', () => {
   setFinderMode(false)
   updateSearchFormIcon('fi fi-rc-search')
   finderCountryModal?.classList.remove('show-login')
   search.classList.add('show-search')
})

finderNavLink?.addEventListener('click', (event) => {
   event.preventDefault()
   setFinderMode(true)
   updateSearchFormIcon('fi fi-rc-bookmark')
   search.classList.add('show-search')
   navMenu.classList.remove('show-menu')
})

savedNavLink?.addEventListener('click', async (event) => {
   event.preventDefault()

   if (!currentUser) {
      showLogin()
      return
   }

   await loadSavedDistros()
   searchInput.value = ''
   updateSearchFormIcon('fi fi-rc-bookmark')
   search.classList.add('show-search')
   renderSavedDistrosList()
   navMenu.classList.remove('show-menu')
})

searchClose.addEventListener('click', () => {
   search.classList.remove('show-search')
   updateSearchFormIcon('fi fi-rc-search')
   hideSearchResults()
   hideFinderResults()
   setFinderMode(false)
   finderCountryModal?.classList.remove('show-login')
})

searchForm.addEventListener('submit', (event) => {
   if (isFinderMode) {
      event.preventDefault()
      runFinderSearch()
      return
   }

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

function hideFinderResults() {
   finderDistroResults.style.display = 'none'
   finderDistroResults.innerHTML = ''
}

function setFinderMode(active) {
   isFinderMode = Boolean(active)
   search.classList.toggle('is-finder-mode', isFinderMode)

   if (isFinderMode) {
      searchInput.placeholder = 'Nach Distro-Namen suchen...'
      finderFilterOptions.style.display = 'grid'
      hideSearchResults()
      hideFinderResults()
      updateFinderSpeedRangeUi()
      renderFinderCountrySummary()
      if (shouldAutoFocusSearchInputs()) {
         setTimeout(() => searchInput.focus(), 0)
      }
      return
   }

   searchInput.placeholder = 'Wonach suchst du?'
   finderFilterOptions.style.display = 'none'
   hideFinderResults()
}

function getSelectedFinderCountries() {
   return [...finderSelectedCountries]
}

function sortFinderFilterOptions() {
   if (finderTagsContainer) {
      const sortedTagButtons = Array.from(finderTagsContainer.querySelectorAll('.finder-filter__tag-option'))
         .sort((firstButton, secondButton) => firstButton.textContent.trim().localeCompare(secondButton.textContent.trim(), 'de'))

      sortedTagButtons.forEach((button) => {
         finderTagsContainer.appendChild(button)
      })
   }

   if (finderFilterCodebase) {
      const options = Array.from(finderFilterCodebase.options)
      const defaultOption = options.find((option) => option.value === '')
      const otherOptions = options
         .filter((option) => option.value !== '')
         .sort((firstOption, secondOption) => firstOption.textContent.trim().localeCompare(secondOption.textContent.trim(), 'de'))

      finderFilterCodebase.innerHTML = ''
      if (defaultOption) {
         finderFilterCodebase.appendChild(defaultOption)
      }
      otherOptions.forEach((option) => finderFilterCodebase.appendChild(option))
   }
}

function getSelectedFinderTags() {
   return Object.entries(finderTagStates)
      .filter(([, state]) => state === 'include')
      .map(([tag]) => tag)
}

function getExcludedFinderTags() {
   return Object.entries(finderTagStates)
      .filter(([, state]) => state === 'exclude')
      .map(([tag]) => tag)
}

function applyFinderTagButtonState(button, state) {
   button.classList.toggle('is-selected', state === 'include')
   button.classList.toggle('is-excluded', state === 'exclude')
}

function cycleFinderTagState(tagValue) {
   const currentState = finderTagStates[tagValue] || 'neutral'

   if (currentState === 'neutral') {
      finderTagStates[tagValue] = 'include'
      return 'include'
   }

   if (currentState === 'include') {
      finderTagStates[tagValue] = 'exclude'
      return 'exclude'
   }

   delete finderTagStates[tagValue]
   return 'neutral'
}

function initFinderTagButtons() {
   finderTagButtons.forEach((button) => {
      button.addEventListener('click', () => {
         const tagValue = button.dataset.value
         const nextState = cycleFinderTagState(tagValue)
         applyFinderTagButtonState(button, nextState)

         if (isFinderMode) {
            hideFinderResults()
            finderFilterOptions.style.display = 'grid'
         }
      })
   })
}

function runFinderSearch(options = {}) {
   const { keepFiltersOpen = false } = options
   const nameQuery = searchInput.value.trim().toLowerCase()
   const selectedCountries = getSelectedFinderCountries()
   const includedTags = getSelectedFinderTags()
   const excludedTags = getExcludedFinderTags()
   const selectedCodebase = finderFilterCodebase.value
   const minIsoSizeMb = Number.parseInt(finderFilterSpeedMin.value, 10) || FINDER_ISO_SIZE_MIN_MB
   const maxIsoSizeMb = Number.parseInt(finderFilterSpeedMax.value, 10) || FINDER_ISO_SIZE_MAX_MB
   const hasIsoRangeFilter = minIsoSizeMb > FINDER_ISO_SIZE_MIN_MB || maxIsoSizeMb < FINDER_ISO_SIZE_MAX_MB
   const hasRankingSignal = Boolean(nameQuery) || hasIsoRangeFilter || selectedCountries.length > 1
   const targetIsoSizeMb = (minIsoSizeMb + maxIsoSizeMb) / 2

   const matches = DISTRO_FINDER_DATA.filter((distro) => {
      const matchesName = !nameQuery || distro.name.toLowerCase().includes(nameQuery)
      const matchesCodebase = !selectedCodebase || distro.codebase === selectedCodebase
      const matchesCountries = !selectedCountries.length || distro.countries.some((country) => selectedCountries.includes(country))
      const matchesIncludedTags = !includedTags.length || includedTags.every((tag) => distro.tags.includes(tag))
      const matchesExcludedTags = !excludedTags.length || !excludedTags.some((tag) => distro.tags.includes(tag))
      const matchesIsoSize = distro.isoSizeMb >= minIsoSizeMb && distro.isoSizeMb <= maxIsoSizeMb
      return matchesName && matchesCodebase && matchesCountries && matchesIncludedTags && matchesExcludedTags && matchesIsoSize
   }).sort((firstDistro, secondDistro) => {
      if (!hasRankingSignal) {
         return firstDistro.name.localeCompare(secondDistro.name, 'de')
      }

      const firstScore = getFinderRelevanceScore(firstDistro, {
         nameQuery,
         selectedCountries,
         targetIsoSizeMb,
         hasIsoRangeFilter
      })
      const secondScore = getFinderRelevanceScore(secondDistro, {
         nameQuery,
         selectedCountries,
         targetIsoSizeMb,
         hasIsoRangeFilter
      })

      if (secondScore !== firstScore) {
         return secondScore - firstScore
      }

      return firstDistro.name.localeCompare(secondDistro.name, 'de')
   })

   renderFinderDistroResults(matches)
   if (!keepFiltersOpen) {
      finderFilterOptions.style.display = 'none'
   }
}

function getFinderRelevanceScore(distro, context) {
   const { nameQuery, selectedCountries, targetIsoSizeMb, hasIsoRangeFilter } = context
   let score = 0

   if (nameQuery) {
      const nameLower = distro.name.toLowerCase()
      const matchIndex = nameLower.indexOf(nameQuery)

      if (matchIndex === 0) {
         score += 120
      } else if (matchIndex > 0) {
         score += Math.max(60 - matchIndex, 10)
      }

      if (nameLower === nameQuery) {
         score += 40
      }
   }

   if (selectedCountries.length > 1) {
      const countryMatches = distro.countries.filter((country) => selectedCountries.includes(country)).length
      score += countryMatches * 8
   }

   if (hasIsoRangeFilter) {
      const isoDistance = Math.abs(distro.isoSizeMb - targetIsoSizeMb)
      score += Math.max(40 - Math.floor(isoDistance / 100), 0)
   }

   return score
}

function updateFinderSpeedRangeUi() {
   if (!finderFilterSpeedMin || !finderFilterSpeedMax) return

   const minVal = Number.parseInt(finderFilterSpeedMin.value, 10) || FINDER_ISO_SIZE_MIN_MB
   const maxVal = Number.parseInt(finderFilterSpeedMax.value, 10) || FINDER_ISO_SIZE_MAX_MB

   finderFilterSpeedMinValue.textContent = formatFinderIsoSize(minVal)
   finderFilterSpeedMaxValue.textContent = formatFinderIsoSize(maxVal)

   const rangeWrap = finderFilterSpeedMin.parentElement
   if (!rangeWrap) return

   const sizeRange = FINDER_ISO_SIZE_MAX_MB - FINDER_ISO_SIZE_MIN_MB
   const minPercent = ((minVal - FINDER_ISO_SIZE_MIN_MB) / sizeRange) * 100
   const maxPercent = ((maxVal - FINDER_ISO_SIZE_MIN_MB) / sizeRange) * 100
   rangeWrap.style.setProperty('--range-min', minPercent + '%')
   rangeWrap.style.setProperty('--range-max', maxPercent + '%')
}

function formatFinderIsoSize(sizeMb) {
   if (sizeMb >= 1000) {
      return `${(sizeMb / 1000).toFixed(1)} GB`
   }

   return `${sizeMb} MB`
}

function normalizeDistroKey(name = '') {
   return String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80)
}

function findDistroByKey(distroKey = '') {
   if (!distroKey) return null
   return DISTRO_FINDER_DATA.find((distro) => normalizeDistroKey(distro.name) === distroKey) || null
}

function getFallbackDistroBySavedEntry(entry = {}) {
   const distroName = typeof entry?.distro_name === 'string' ? entry.distro_name.trim() : ''
   const distroKey = typeof entry?.distro_key === 'string' ? entry.distro_key.trim() : ''

   return {
      name: distroName || distroKey || 'Unbekannte Distro',
      codebase: '',
      tags: [],
      description: 'Keine Detaildaten hinterlegt.',
      pros: [],
      cons: []
   }
}

function updateDistroBookmarkButtonState() {
   if (!distroModalBookmarkBtn) return

   const canShow = Boolean(currentUser && currentDistroKey)
   distroModalBookmarkBtn.style.display = canShow ? 'inline-flex' : 'none'
   if (!canShow) return

   const isSaved = savedDistroKeySet.has(currentDistroKey)
   distroModalBookmarkBtn.title = isSaved ? 'Vergessen' : 'Speichern'
   distroModalBookmarkBtn.setAttribute('aria-label', isSaved ? 'Vergessen' : 'Speichern')
   distroModalBookmarkBtn.innerHTML = isSaved
      ? '<i class="fi fi-sc-bookmark"></i>'
      : '<i class="fi fi-rc-bookmark"></i>'
}

function applySavedDistrosPayload(payload = {}) {
   const savedDistros = Array.isArray(payload.savedDistros) ? payload.savedDistros : []
   savedDistroEntries = savedDistros
      .map((entry) => ({
         distro_key: typeof entry?.distro_key === 'string' ? entry.distro_key : '',
         distro_name: typeof entry?.distro_name === 'string' ? entry.distro_name : '',
         created_at: entry?.created_at || null
      }))
      .filter((entry) => Boolean(entry.distro_key))

   savedDistroEntries.sort((first, second) => {
      const firstName = first.distro_name || first.distro_key
      const secondName = second.distro_name || second.distro_key
      return firstName.localeCompare(secondName, 'de', { sensitivity: 'base' })
   })

   savedDistroKeySet = new Set(savedDistroEntries.map((entry) => entry.distro_key))
   updateDistroBookmarkButtonState()
}

async function loadSavedDistros() {
   if (!currentUser) {
      applySavedDistrosPayload({ savedDistros: [] })
      return []
   }

   try {
      const response = await fetch('/api/auth/distros/saved', {
         credentials: 'include'
      })

      if (!response.ok) {
         applySavedDistrosPayload({ savedDistros: [] })
         return []
      }

      const data = await response.json()
      applySavedDistrosPayload(data)
      return savedDistroEntries
   } catch (_) {
      applySavedDistrosPayload({ savedDistros: [] })
      return []
   }
}

async function saveCurrentDistroForUser() {
   if (!currentUser || !currentDistroKey) return false

   const response = await fetch(`/api/auth/distros/${encodeURIComponent(currentDistroKey)}/saved`, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
         distroName: currentDistroName || currentDistroData?.name || currentDistroKey
      })
   })

   const data = await response.json().catch(() => ({}))
   if (!response.ok) {
      const errorText = data?.error || 'Distro konnte nicht gespeichert werden.'
      showPublicProfileNotice(errorText, 'error', 2600)
      return false
   }

   await loadSavedDistros()
   return true
}

async function removeCurrentDistroForUser() {
   if (!currentUser || !currentDistroKey) return false

   const response = await fetch(`/api/auth/distros/${encodeURIComponent(currentDistroKey)}/saved`, {
      method: 'DELETE',
      credentials: 'include'
   })

   const data = await response.json().catch(() => ({}))
   if (!response.ok) {
      const errorText = data?.error || 'Distro konnte nicht entfernt werden.'
      showPublicProfileNotice(errorText, 'error', 2600)
      return false
   }

   await loadSavedDistros()
   return true
}

function renderSavedDistrosList() {
   setFinderMode(false)
   hideFinderResults()
   searchResults.innerHTML = ''

   const group = document.createElement('section')
   group.className = 'search-results__group'

   const heading = document.createElement('h3')
   heading.className = 'search-results__title'
   heading.textContent = 'Gespeicherte Distros'
   group.appendChild(heading)

   const list = document.createElement('div')
   list.className = 'search-results__list'

   if (!savedDistroEntries.length) {
      const empty = document.createElement('p')
      empty.className = 'search-results__empty'
      empty.textContent = 'Du hast noch keine Distros gespeichert.'
      list.appendChild(empty)
   } else {
      savedDistroEntries.forEach((entry) => {
         const item = document.createElement('button')
         item.type = 'button'
         item.className = 'search-results__item'
         item.textContent = entry.distro_name || entry.distro_key
         item.addEventListener('click', () => {
            const distro = findDistroByKey(entry.distro_key) || getFallbackDistroBySavedEntry(entry)
            openDistroModal(distro)
         })
         list.appendChild(item)
      })
   }

   group.appendChild(list)
   searchResults.appendChild(group)
   searchResults.style.display = 'block'
}

function setDistroAvatar(distro) {
   if (!distroModalAvatar) return

   if (distro?.logo) {
      distroModalAvatar.src = distro.logo
      distroModalAvatar.alt = `${distro.name || 'Distro'} Logo`
      distroModalAvatar.style.display = 'block'
      return
   }

   distroModalAvatar.removeAttribute('src')
   distroModalAvatar.alt = 'Kein Logo vorhanden'
   distroModalAvatar.style.display = 'none'
}

function getYoutubeIdFromUrl(url = '') {
   if (!url) return ''

   try {
      const parsed = new URL(url)
      if (parsed.hostname.includes('youtu.be')) {
         return parsed.pathname.replace('/', '')
      }

      if (parsed.searchParams.has('v')) {
         return parsed.searchParams.get('v') || ''
      }

      const embedMatch = parsed.pathname.match(/\/embed\/([^/?#]+)/)
      if (embedMatch?.[1]) return embedMatch[1]
   } catch (_) {
      // ignore
   }

   return ''
}

function resetDistroVideo() {
   if (distroModalVideoIframe) {
      distroModalVideoIframe.removeAttribute('src')
      distroModalVideoIframe.style.display = 'none'
   }

   if (distroModalVideoPlay) {
      distroModalVideoPlay.style.display = 'none'
      distroModalVideoPlay.dataset.embedUrl = ''
   }

   if (distroModalVideo) {
      distroModalVideo.style.display = 'none'
   }
}

function setDistroVideo(distro) {
   if (!distroModalVideo || !distroModalVideoIframe || !distroModalVideoPlay) return

   resetDistroVideo()

   const directId = distro.videoId || ''
   const derivedId = getYoutubeIdFromUrl(distro.videoUrl || '')
   const videoId = directId || derivedId

   if (!videoId) return

   const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`

   distroModalVideo.style.display = 'block'
   distroModalVideoPlay.style.display = 'inline-flex'
   distroModalVideoPlay.dataset.embedUrl = embedUrl
}

distroModalVideoPlay?.addEventListener('click', () => {
   if (!distroModalVideoIframe || !distroModalVideoPlay) return

   const embedUrl = distroModalVideoPlay.dataset.embedUrl
   if (!embedUrl) return

   distroModalVideoPlay.style.display = 'none'
   distroModalVideoIframe.style.display = 'block'
   distroModalVideoIframe.src = embedUrl
})

function setDistroLink(anchor, url) {
   if (!anchor) return
   if (url) {
      anchor.style.display = 'inline-flex'
      anchor.href = url
   } else {
      anchor.style.display = 'none'
      anchor.removeAttribute('href')
   }
}

function renderDistroTags(tags = []) {
   if (!distroModalTags) return

   distroModalTags.innerHTML = ''

   if (!Array.isArray(tags) || !tags.length) {
      distroModalTags.style.display = 'none'
      return
   }

   tags.forEach((tag) => {
      const label = FINDER_TAG_LABEL_BY_VALUE[tag] || tag
      const pill = document.createElement('span')
      pill.className = 'distro-modal__tag'
      pill.textContent = label
      distroModalTags.appendChild(pill)
   })

   distroModalTags.style.display = 'flex'
}

function normalizeDistroPoints(points = []) {
   if (Array.isArray(points)) {
      return points.map((entry) => String(entry).trim()).filter(Boolean)
   }

   if (typeof points === 'string') {
      return points
         .split(/\r?\n|;/) // allow newline or semicolon separation when a single string is provided
         .map((entry) => entry.trim())
         .filter(Boolean)
   }

   return []
}

function renderDistroPointList(listEl, boxEl, points = [], { symbol = '•', emptyText = '' } = {}) {
   if (!listEl || !boxEl) return

   const items = normalizeDistroPoints(points)
   listEl.innerHTML = ''

   if (!items.length) {
      if (emptyText) {
         const fallback = document.createElement('li')
         fallback.className = 'distro-modal__list-item distro-modal__list-item--empty'
         fallback.textContent = emptyText
         listEl.appendChild(fallback)
         boxEl.style.display = 'block'
      } else {
         boxEl.style.display = 'none'
      }
      return
   }

   items.forEach((entry) => {
      const item = document.createElement('li')
      item.className = 'distro-modal__list-item'

      const bullet = document.createElement('span')
      bullet.className = 'distro-modal__list-bullet'
      bullet.textContent = symbol

      const text = document.createElement('span')
      text.className = 'distro-modal__list-text'
      text.textContent = entry

      item.appendChild(bullet)
      item.appendChild(text)
      listEl.appendChild(item)
   })

   boxEl.style.display = 'block'
}

function setDistroRatingMessage(text = '', type = '') {
   if (!distroRatingMessage) return
   const normalizedType = type ? ` ${type}` : ''
   distroRatingMessage.textContent = text
   distroRatingMessage.className = `login__message${normalizedType}`
}

function renderRatingStars(container, filledCount = 0) {
   if (!container) return

   const safeFilled = Math.max(0, Math.min(5, Math.round(filledCount)))
   container.innerHTML = ''

   for (let i = 1; i <= 5; i += 1) {
      const icon = document.createElement('i')
      const isFilled = i <= safeFilled
      icon.className = isFilled ? 'fi fi-sr-star' : 'fi fi-rr-star'
      icon.ariaHidden = 'true'

      const wrapper = document.createElement('span')
      wrapper.className = 'distro-rating__star' + (isFilled ? ' is-filled' : '')
      wrapper.appendChild(icon)
      container.appendChild(wrapper)
   }
}

function createReviewElement(review = {}, { maxLength = 200 } = {}) {
   const item = document.createElement('article')
   item.className = 'distro-rating__review'

   const avatar = document.createElement('img')
   avatar.className = 'distro-rating__review-avatar'
   avatar.src = getAvatarUrl({ avatar: review.avatar, full_name: review.full_name || review.username || 'Nutzer' })
   avatar.alt = review.profile_name || review.username || 'Nutzer'
   if (review.username) {
      avatar.style.cursor = 'pointer'
      avatar.addEventListener('click', () => openPublicProfileByUsername(review.username))
   }

   const body = document.createElement('div')
   body.className = 'distro-rating__review-body'

   const header = document.createElement('div')
   header.className = 'distro-rating__review-header'

   const name = document.createElement('span')
   name.className = 'distro-rating__review-name'
   name.textContent = review.profile_name || review.username || 'Unbekannt'
   if (review.username) {
      name.classList.add('is-clickable')
      name.addEventListener('click', () => openPublicProfileByUsername(review.username))
   }

   const stars = document.createElement('div')
   stars.className = 'distro-rating__review-stars'
   renderRatingStars(stars, Number(review.rating) || 0)

   header.appendChild(name)
   header.appendChild(stars)

   const text = document.createElement('p')
   text.className = 'distro-rating__review-text'
   const fullText = review.message || 'Keine Nachricht hinterlassen.'
   const truncated = fullText.length > maxLength ? `${fullText.slice(0, maxLength)}…` : fullText
   text.textContent = truncated
   text.dataset.fullText = fullText
   text.dataset.truncatedText = truncated
   text.dataset.state = fullText.length > maxLength ? 'truncated' : 'full'
   if (fullText.length > maxLength) {
      text.classList.add('distro-rating__review-text--truncatable')
      text.addEventListener('click', () => {
         const isTruncated = text.dataset.state !== 'full'
         text.textContent = isTruncated ? fullText : text.dataset.truncatedText
         text.dataset.state = isTruncated ? 'full' : 'truncated'
      })
   }

   body.appendChild(header)
   body.appendChild(text)

   item.appendChild(avatar)
   item.appendChild(body)

   return item
}

function renderDistroReviews(reviews = []) {
   if (!distroRatingReviews) return

   const safeReviews = Array.isArray(reviews) ? reviews : []
   distroRatingReviews.innerHTML = ''

   if (!safeReviews.length) {
      const empty = document.createElement('p')
      empty.className = 'distro-rating__empty'
      empty.textContent = 'Noch keine Rezensionen vorhanden.'
      distroRatingReviews.appendChild(empty)
      if (distroRatingViewAll) {
         distroRatingViewAll.style.display = 'none'
      }
      return
   }

   safeReviews.slice(0, 3).forEach((review) => {
      distroRatingReviews.appendChild(createReviewElement(review))
   })

   if (distroRatingViewAll) {
      distroRatingViewAll.style.display = safeReviews.length > 3 ? 'inline-flex' : 'none'
   }
}

function renderAllDistroReviewsModal() {
   if (!distroReviewsModalList) return
   distroReviewsModalList.innerHTML = ''

   const safeReviews = Array.isArray(currentDistroReviews) ? currentDistroReviews : []
   if (!safeReviews.length) {
      const empty = document.createElement('p')
      empty.className = 'distro-rating__empty'
      empty.textContent = 'Noch keine Rezensionen vorhanden.'
      distroReviewsModalList.appendChild(empty)
      return
   }

   safeReviews.forEach((review) => {
      distroReviewsModalList.appendChild(createReviewElement(review))
   })
}

function openDistroReviewsModal() {
   if (!distroReviewsModal) return
   renderAllDistroReviewsModal()
   distroReviewsModal.classList.add('show-login')
}

function closeDistroReviewsModal() {
   if (!distroReviewsModal) return
   distroReviewsModal.classList.remove('show-login')
}

function updateDistroRatingActionLabel() {
   if (!distroRatingOpenBtn) return

   distroRatingOpenBtn.textContent = currentDistroUserReview
      ? 'Bewertung überarbeiten'
      : 'Bewertung abgeben'
}

function applyDistroRatingState(payload = {}) {
   if (!distroRatingAverage || !distroRatingStars) return

   const average = Number(payload.average || 0)
   currentDistroReviews = Array.isArray(payload.reviews) ? payload.reviews : []

   distroRatingAverage.textContent = average.toFixed(1)
   renderRatingStars(distroRatingStars, average)
   renderDistroReviews(currentDistroReviews)

   currentDistroUserReview = payload.userReview || null
   updateDistroRatingActionLabel()

   if (distroRatingOpenBtn) {
      distroRatingOpenBtn.style.display = currentUser ? 'inline-flex' : 'none'
   }
}

async function loadDistroRatings(distro) {
   if (!distro) return

   currentDistroName = distro.name || ''
   currentDistroKey = normalizeDistroKey(distro.name)
   currentDistroUserReview = null
   updateDistroRatingActionLabel()

   if (!currentDistroKey) {
      applyDistroRatingState({ average: 0, count: 0, reviews: [], userReview: null })
      return
   }

   try {
      const response = await fetch(`/api/auth/distros/${encodeURIComponent(currentDistroKey)}/ratings`, {
         credentials: 'include'
      })

      if (!response.ok) {
         throw new Error('Failed to load ratings')
      }

      const data = await response.json()
      applyDistroRatingState(data)
   } catch (_) {
      applyDistroRatingState({ average: 0, count: 0, reviews: [], userReview: null })

      if (distroRatingReviews) {
         const error = document.createElement('p')
         error.className = 'distro-rating__error'
         error.textContent = 'Bewertungen konnten nicht geladen werden.'
         distroRatingReviews.innerHTML = ''
         distroRatingReviews.appendChild(error)
      }
   }
}

function updateDistroRatingSelection(value) {
   distroRatingSelection = Math.max(0, Math.min(5, Number(value) || 0))

   if (distroRatingSelectedValue) {
      distroRatingSelectedValue.textContent = `${distroRatingSelection}/5`
   }

   if (!distroRatingSelectStars) return

   const starButtons = Array.from(distroRatingSelectStars.querySelectorAll('.distro-rating-modal__star'))
   starButtons.forEach((button) => {
      const starValue = Number(button.dataset.value)
      const isActive = distroRatingSelection >= starValue
      button.classList.toggle('is-active', isActive)

      const icon = button.querySelector('i')
      if (icon) {
         icon.className = isActive ? 'fi fi-sr-star' : 'fi fi-rr-star'
      }
   })
}

function openDistroRatingModal() {
   if (!distroRatingModal) return

   const defaultRating = currentDistroUserReview?.rating || 0
   distroRatingText.value = currentDistroUserReview?.message || ''
   updateCounter(distroRatingCounter, distroRatingText.value, 1000)
   updateDistroRatingSelection(defaultRating)
   setDistroRatingMessage('')

   distroRatingModal.classList.add('show-login')
}

function closeDistroRatingModal() {
   if (!distroRatingModal) return
   distroRatingModal.classList.remove('show-login')
}

function openDistroModal(distro) {
   if (!distroModal || !distro) return

   hideFinderResults()
   hideSearchResults()
   search.classList.remove('show-search')

   setDistroAvatar(distro)
   currentDistroData = distro

   if (distroModalName) {
      distroModalName.textContent = distro.name || 'Unbekannte Distro'
   }

   if (distroModalCodebase) {
      const hasCodebase = Boolean(distro.codebase)
      distroModalCodebase.textContent = hasCodebase ? distro.codebase : ''
      distroModalCodebase.style.display = hasCodebase ? 'inline' : 'none'
   }

   if (distroModalIso) {
      const hasIso = Number.isFinite(distro.isoSizeMb)
      distroModalIso.textContent = hasIso ? `ISO: ${formatFinderIsoSize(distro.isoSizeMb)}` : ''
   }

   setDistroLink(distroModalDocs, distro.docsUrl)
   setDistroLink(distroModalDownload, distro.downloadUrl)

   renderDistroTags(distro.tags)

   if (distroModalDescription && distroModalDescriptionBox) {
      const hasText = Boolean(distro.description)
      distroModalDescription.textContent = distro.description || ''
      distroModalDescriptionBox.style.display = hasText ? 'block' : 'none'
   }

   const fallbackProsCons = DISTRO_PROS_CONS[distro.name] || {}
   const pros = distro.pros ?? fallbackProsCons.pros
   const cons = distro.cons ?? fallbackProsCons.cons

   renderDistroPointList(distroModalProsList, distroModalProsBox, pros, {
      symbol: '+',
      emptyText: 'Noch keine Vorteile hinterlegt.'
   })

   renderDistroPointList(distroModalConsList, distroModalConsBox, cons, {
      symbol: '-',
      emptyText: 'Noch keine Nachteile hinterlegt.'
   })

   setDistroVideo(distro)

   loadDistroRatings(distro)
   updateDistroBookmarkButtonState()

   distroModal.classList.add('show-login')
}

function renderFinderDistroResults(matches) {
   finderDistroResults.innerHTML = ''

   const group = document.createElement('section')
   group.className = 'search-results__group'

   const heading = document.createElement('h3')
   heading.className = 'finder-distro-results__title'
   heading.textContent = 'Passende Distros'
   group.appendChild(heading)

   if (!matches.length) {
      const empty = document.createElement('p')
      empty.className = 'search-results__empty'
      empty.textContent = 'Keine passenden Distros gefunden'
      group.appendChild(empty)
   } else {
      const list = document.createElement('div')
      list.className = 'finder-distro-results__list'

      matches.forEach((distro) => {
         const item = document.createElement('button')
         item.type = 'button'
         item.className = 'search-results__item'
         item.textContent = distro.name
         item.addEventListener('click', (event) => {
            event.preventDefault()
            openDistroModal(distro)
         })
         list.appendChild(item)
      })

      group.appendChild(list)
   }

   finderDistroResults.appendChild(group)
   finderDistroResults.style.display = 'block'
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

function createDistroSearchGroup(title, distros) {
   const group = document.createElement('section')
   group.className = 'search-results__group'

   const heading = document.createElement('h3')
   heading.className = 'search-results__title'
   heading.textContent = title
   group.appendChild(heading)

   const list = document.createElement('div')
   list.className = 'search-results__list'

   if (!distros.length) {
      const empty = document.createElement('p')
      empty.className = 'search-results__empty'
      empty.textContent = 'Keine Treffer'
      list.appendChild(empty)
   } else {
      distros.forEach((distro) => {
         const item = document.createElement('button')
         item.type = 'button'
         item.className = 'search-results__item'
         item.textContent = distro.name

         item.addEventListener('click', () => {
            hideSearchResults()
            search.classList.remove('show-search')
            openDistroModal(distro)
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

   const query = searchInput.value.trim().toLowerCase()
   const matchedDistros = query
      ? DISTRO_FINDER_DATA.filter((d) => d.name.toLowerCase().includes(query))
      : []

   searchResults.innerHTML = ''
   searchResults.appendChild(createSearchGroup('Anzeigename', displayNames, (user) => user.profile_name || '(kein Anzeigename)'))
   searchResults.appendChild(createSearchGroup('Username', usernames, (user) => '@' + user.username))
   searchResults.appendChild(createDistroSearchGroup('Distros', matchedDistros))
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
   if (isFinderMode) return

   if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
   }

   searchDebounceTimer = setTimeout(() => {
      loadSearchResults(searchInput.value)
   }, 200)
})

finderFilterSpeedMin?.addEventListener('input', () => {
   const minVal = Number.parseInt(finderFilterSpeedMin.value, 10) || FINDER_ISO_SIZE_MIN_MB
   const maxVal = Number.parseInt(finderFilterSpeedMax.value, 10) || FINDER_ISO_SIZE_MAX_MB
   
   if (minVal > maxVal) {
      finderFilterSpeedMin.value = maxVal
      finderFilterSpeedMax.value = maxVal
   }

   updateFinderSpeedRangeUi()
})

finderFilterSpeedMax?.addEventListener('input', () => {
   const minVal = Number.parseInt(finderFilterSpeedMin.value, 10) || FINDER_ISO_SIZE_MIN_MB
   const maxVal = Number.parseInt(finderFilterSpeedMax.value, 10) || FINDER_ISO_SIZE_MAX_MB
   
   if (maxVal < minVal) {
      finderFilterSpeedMax.value = minVal
      finderFilterSpeedMin.value = minVal
   }

   updateFinderSpeedRangeUi()
})

finderFilterCountryOpen?.addEventListener('click', openFinderCountryModal)
finderCountryClose?.addEventListener('click', () => {
   finderCountryModal?.classList.remove('show-login')
})
finderCountryApplyBtn?.addEventListener('click', applyFinderCountrySelection)
finderCountryModal?.addEventListener('click', (event) => {
   if (event.target === finderCountryModal) {
      finderCountryModal.classList.remove('show-login')
   }
})

distroModalClose?.addEventListener('click', () => {
   resetDistroVideo()
   distroModal?.classList.remove('show-login')
})

distroModal?.addEventListener('click', (event) => {
   if (event.target === distroModal) {
      resetDistroVideo()
      distroModal.classList.remove('show-login')
   }
})

distroRatingOpenBtn?.addEventListener('click', () => {
   if (!currentUser) {
      showLogin()
      return
   }

   openDistroRatingModal()
})

if (distroRatingSelectStars) {
   const buttons = Array.from(distroRatingSelectStars.querySelectorAll('.distro-rating-modal__star'))
   buttons.forEach((button) => {
      button.addEventListener('click', () => {
         updateDistroRatingSelection(Number(button.dataset.value))
      })
   })

   updateDistroRatingSelection(0)
}

distroRatingViewAll?.addEventListener('click', openDistroReviewsModal)
distroReviewsModalClose?.addEventListener('click', closeDistroReviewsModal)
distroReviewsModalCloseBtn?.addEventListener('click', closeDistroReviewsModal)

distroReviewsModal?.addEventListener('click', (event) => {
   if (event.target === distroReviewsModal) {
      closeDistroReviewsModal()
   }
})

distroRatingText?.addEventListener('input', () => {
   const length = distroRatingText.value.length
   updateCounter(distroRatingCounter, distroRatingText.value, 1000)
})

distroRatingCancel?.addEventListener('click', closeDistroRatingModal)
distroRatingModalClose?.addEventListener('click', closeDistroRatingModal)

distroRatingModal?.addEventListener('click', (event) => {
   if (event.target === distroRatingModal) {
      closeDistroRatingModal()
   }
})

distroModalBookmarkBtn?.addEventListener('click', async () => {
   if (!currentUser) {
      showLogin()
      return
   }

   if (!currentDistroKey) {
      showPublicProfileNotice('Keine Distro ausgewählt.', 'error', 2000)
      return
   }

   distroModalBookmarkBtn.disabled = true

   try {
      const isSaved = savedDistroKeySet.has(currentDistroKey)
      if (isSaved) {
         await removeCurrentDistroForUser()
      } else {
         await saveCurrentDistroForUser()
      }
   } finally {
      distroModalBookmarkBtn.disabled = false
      updateDistroBookmarkButtonState()
   }
})

distroRatingSubmit?.addEventListener('click', async () => {
   if (!currentUser) {
      showLogin()
      return
   }

   if (!currentDistroKey) {
      setDistroRatingMessage('Keine Distro ausgewählt.', 'error')
      return
   }

   if (distroRatingSelection < 1 || distroRatingSelection > 5) {
      setDistroRatingMessage('Bitte wähle zwischen 1 und 5 Sternen.', 'error')
      return
   }

   const message = (distroRatingText?.value || '').trim()
   if (message.length > 1000) {
      setDistroRatingMessage('Die Nachricht ist zu lang.', 'error')
      return
   }

   distroRatingSubmit.disabled = true
   distroRatingSubmit.textContent = 'Wird gesendet...'
   setDistroRatingMessage('')

   try {
      const response = await fetch(`/api/auth/distros/${encodeURIComponent(currentDistroKey)}/ratings`, {
         method: 'POST',
         credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            rating: distroRatingSelection,
            message,
            distroName: currentDistroName
         })
      })

      const data = await response.json()

      if (!response.ok) {
         setDistroRatingMessage(data.error || 'Bewertung konnte nicht gespeichert werden.', 'error')
         return
      }

      applyDistroRatingState(data)
      closeDistroRatingModal()
   } catch (_) {
      setDistroRatingMessage('Serverfehler. Bitte versuche es erneut.', 'error')
   } finally {
      distroRatingSubmit.disabled = false
      distroRatingSubmit.textContent = 'Senden'
   }
})

renderFinderCountrySummary()
sortFinderFilterOptions()
if (finderFilterCodebase) {
   finderFilterCodebase.value = ''
}
initFinderTagButtons()

if (finderFilterSpeedMin && finderFilterSpeedMax) {
   finderFilterSpeedMin.min = String(FINDER_ISO_SIZE_MIN_MB)
   finderFilterSpeedMin.max = String(FINDER_ISO_SIZE_MAX_MB)
   finderFilterSpeedMin.step = '100'
   finderFilterSpeedMax.min = String(FINDER_ISO_SIZE_MIN_MB)
   finderFilterSpeedMax.max = String(FINDER_ISO_SIZE_MAX_MB)
   finderFilterSpeedMax.step = '100'

   const minValue = Number.parseInt(finderFilterSpeedMin.value, 10)
   const maxValue = Number.parseInt(finderFilterSpeedMax.value, 10)
   if (!Number.isFinite(minValue)) finderFilterSpeedMin.value = String(FINDER_ISO_SIZE_MIN_MB)
   if (!Number.isFinite(maxValue) || maxValue <= Number.parseInt(finderFilterSpeedMin.value, 10)) {
      finderFilterSpeedMax.value = String(FINDER_ISO_SIZE_MAX_MB)
   }
}

// Initialize dual-range slider CSS variables
updateFinderSpeedRangeUi()

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
   developerUserListModal = document.getElementById('developer-user-list-modal'),
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
      adminUserListClose = document.getElementById('admin-user-list-close'),
      developerUserListClose = document.getElementById('developer-user-list-close')

const staticModalTriggers = document.querySelectorAll('[data-modal-target]')
const staticModalCloseButtons = document.querySelectorAll('[data-modal-close]')
const staticModalPanels = Array.from(document.querySelectorAll('.info-modal'))
const imprintArmandNameLink = document.getElementById('imprint-armand-name')
const imprintArmandEmailLink = document.getElementById('imprint-armand-email')
const imprintJostNameLink = document.getElementById('imprint-jost-name')
const imprintJostEmailLink = document.getElementById('imprint-jost-email')

const projectContactConfig = {
   armand: {
      fallback: {
         full_name: 'Armand Patrick Asztalos',
         username: 'armand',
         email: 'armand.patrick.asztalos@tha.de'
      },
      imprintNameLink: imprintArmandNameLink,
      imprintEmailLink: imprintArmandEmailLink
   },
   jost: {
      fallback: {
         full_name: 'Jost Witthauer',
         username: 'jost',
         email: 'jost.witthauer@tha.de'
      },
      imprintNameLink: imprintJostNameLink,
      imprintEmailLink: imprintJostEmailLink
   }
}

function hideStaticModals() {
   staticModalPanels.forEach((panel) => panel.classList.remove('show-login'))
}

const showLogin    = () => { hideStaticModals(); loginPanel.classList.add('show-login');       registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); accentColorModal.classList.remove('show-login'); birthDateModal.classList.remove('show-login'); beliefModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); distroModal.classList.remove('show-login'); distroRatingModal.classList.remove('show-login'); reportModal.classList.remove('show-login'); bugReportModal.classList.remove('show-login'); adminReportsModal.classList.remove('show-login'); followListModal.classList.remove('show-login'); adminUserListModal.classList.remove('show-search'); developerUserListModal.classList.remove('show-search') }
const showRegister = () => { hideStaticModals(); registerPanel.classList.add('show-register'); loginPanel.classList.remove('show-login');    changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); accentColorModal.classList.remove('show-login'); birthDateModal.classList.remove('show-login'); beliefModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); distroModal.classList.remove('show-login'); distroRatingModal.classList.remove('show-login'); reportModal.classList.remove('show-login'); bugReportModal.classList.remove('show-login'); adminReportsModal.classList.remove('show-login'); followListModal.classList.remove('show-login'); adminUserListModal.classList.remove('show-search'); developerUserListModal.classList.remove('show-search') }
const showResetPassword = () => { hideStaticModals(); resetPasswordPanel.classList.add('show-login'); loginPanel.classList.remove('show-login'); registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); accentColorModal.classList.remove('show-login'); birthDateModal.classList.remove('show-login'); beliefModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); distroModal.classList.remove('show-login'); distroRatingModal.classList.remove('show-login'); reportModal.classList.remove('show-login'); bugReportModal.classList.remove('show-login'); adminReportsModal.classList.remove('show-login'); followListModal.classList.remove('show-login'); adminUserListModal.classList.remove('show-search'); developerUserListModal.classList.remove('show-search') }
const hideAll      = () => { resetDistroVideo(); loginPanel.classList.remove('show-login');    registerPanel.classList.remove('show-register'); changeUsernamePanel.classList.remove('show-login'); resetPasswordPanel.classList.remove('show-login'); profileModal.classList.remove('show-login'); accentColorModal.classList.remove('show-login'); birthDateModal.classList.remove('show-login'); beliefModal.classList.remove('show-login'); publicProfileModal.classList.remove('show-login'); distroModal.classList.remove('show-login'); distroRatingModal.classList.remove('show-login'); reportModal.classList.remove('show-login'); bugReportModal.classList.remove('show-login'); adminReportsModal.classList.remove('show-login'); followListModal.classList.remove('show-login'); adminUserListModal.classList.remove('show-search'); developerUserListModal.classList.remove('show-search'); hideStaticModals() }

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
developerUserListClose.addEventListener('click', hideAll)

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
const navAdminToolsBtn = document.getElementById('nav-admin-tools')
const navDeveloperToolsBtn = document.getElementById('nav-developer-tools')
const profileBtn  = document.getElementById('profile-btn')
const profileLogoutBtn = document.getElementById('profile-logout-btn')
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
const profileAvatarArtistUrlInput = document.getElementById('profile-avatar-artist-url-input')
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
const profileCursorInput = document.getElementById('profile-cursor-input')
const profileCursorPickBtn = document.getElementById('profile-cursor-pick-btn')
const profileCursorFilename = document.getElementById('profile-cursor-filename')
const profileCursorResetBtn = document.getElementById('profile-cursor-reset-btn')
const profilePointerInput = document.getElementById('profile-pointer-input')
const profilePointerPickBtn = document.getElementById('profile-pointer-pick-btn')
const profilePointerFilename = document.getElementById('profile-pointer-filename')
const profilePointerResetBtn = document.getElementById('profile-pointer-reset-btn')
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
const publicProfileDeveloper = document.getElementById('public-profile-developer')
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
const unbanRequestReasonInput = document.getElementById('unban-request-reason-input')
const unbanRequestReasonCounter = document.getElementById('unban-request-reason-counter')
const unbanRequestSubmitBtn = document.getElementById('unban-request-submit-btn')
const unbanRequestCancelBtn = document.getElementById('unban-request-cancel-btn')
const adminReportsTitle = document.getElementById('admin-reports-title')
const adminReportsList = document.getElementById('admin-reports-list')
const adminReportsCloseBtn = document.getElementById('admin-reports-close-btn')
const adminReportsTabs = document.querySelector('.admin-reports__tabs')
const adminReportsTabMeldungen = document.getElementById('admin-reports-tab-meldungen')
const adminReportsTabEntbannungen = document.getElementById('admin-reports-tab-entbannungen')
const adminBugReportsList = document.getElementById('admin-bug-reports-list')
const adminUnbanRequestsList = document.getElementById('admin-unban-requests-list')
const followListTitle = document.getElementById('follow-list-title')
const followListContainer = document.getElementById('follow-list-container')
const adminUserListSearch = document.getElementById('admin-user-list-search')
const adminUserListResults = document.getElementById('admin-user-list-results')
const adminUserListForm = document.getElementById('admin-user-list-form')
const developerUserListSearch = document.getElementById('developer-user-list-search')
const developerUserListResults = document.getElementById('developer-user-list-results')
const developerUserListForm = document.getElementById('developer-user-list-form')

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
const LOCAL_CURSOR_STORAGE_PREFIX = 'local-custom-cursor:'
const LOCAL_POINTER_STORAGE_PREFIX = 'local-custom-pointer:'
const LOCAL_BACKGROUND_MAX_DATA_URL_LENGTH = 36000000
const LOCAL_CURSOR_MAX_DATA_URL_LENGTH = 12000000
const mainContainer = document.querySelector('.main')
const DEFAULT_MAIN_BACKGROUND_SRC = 'none'

const messageTimers = new Map()
let currentAdminReportsUsername = ''

function setAdminReportsTab(tab = 'meldungen') {
   const isMeldungen = tab === 'meldungen'
   const isBugs = tab === 'bugs'
   const isEntbannungen = tab === 'entbannungen'

   if (adminReportsList) {
      adminReportsList.style.display = isMeldungen ? 'block' : 'none'
   }
   if (adminBugReportsList) {
      adminBugReportsList.style.display = isBugs ? 'block' : 'none'
   }
   if (adminUnbanRequestsList) {
      adminUnbanRequestsList.style.display = isEntbannungen ? 'block' : 'none'
   }

   if (adminReportsTabMeldungen && adminReportsTabEntbannungen) {
      adminReportsTabMeldungen.classList.toggle('active', isMeldungen)
      adminReportsTabEntbannungen.classList.toggle('active', isEntbannungen)
   }
}

function createAdminReportItem(report, username, viewerIsAdministrator) {
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

   return item
}

async function loadAdminReportsForUser(username) {
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
         return
      }

      reports.forEach((report) => {
         adminReportsList.appendChild(createAdminReportItem(report, username, viewerIsAdministrator))
      })
   } catch (_) {
      showMsg('admin-reports-message', 'Server nicht erreichbar.', 'error')
      adminReportsList.innerHTML = '<p class="admin-reports__empty">Meldungen konnten nicht geladen werden.</p>'
   }
}

function createAdminUnbanRequestItem(request, username, viewerIsAdministrator) {
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

   return item
}

async function loadAdminUnbanRequests(username) {
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
         adminUnbanRequestsList.appendChild(createAdminUnbanRequestItem(request, username, viewerIsAdministrator))
      })
   } catch (_) {
      showMsg('admin-reports-message', 'Server nicht erreichbar.', 'error')
   }
}

async function openAdminReports(username, initialTab = 'meldungen') {
   if (!username) return
   currentAdminReportsUsername = username

   clearMsg('admin-reports-message')
   adminReportsTitle.textContent = `Tickets für @${username}`
   if (adminReportsTabs) {
      adminReportsTabs.style.display = ''
   }
   adminReportsList.innerHTML = ''
   adminBugReportsList.innerHTML = ''
   adminUnbanRequestsList.innerHTML = ''
   setAdminReportsTab(initialTab)

   hideAll()
   adminReportsModal.classList.add('show-login')

   await loadAdminReportsForUser(username)
   await loadAdminUnbanRequests(username)

}

async function openDeveloperBugReports(username) {
   if (!username) return

   clearMsg('admin-reports-message')
   adminReportsTitle.textContent = `Bugs für @${username}`
   if (adminReportsTabs) {
      adminReportsTabs.style.display = 'none'
   }
   adminReportsList.innerHTML = ''
   adminBugReportsList.innerHTML = ''
   adminUnbanRequestsList.innerHTML = ''
   setAdminReportsTab('bugs')

   hideAll()
   adminReportsModal.classList.add('show-login')

   await loadAdminBugReports(username)
}

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=3379AC&color=fff&name='
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

if (navAdminToolsBtn) {
   navAdminToolsBtn.addEventListener('click', async (event) => {
      event.preventDefault()
      await openAdminUserListModal()
   })
}

if (navDeveloperToolsBtn) {
   navDeveloperToolsBtn.addEventListener('click', async (event) => {
      event.preventDefault()
      await openDeveloperUserListModal()
   })
}

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
   } catch {
      showMsg('bug-report-message', 'Serverfehler. Bitte versuche es später erneut.', 'error')
      bugReportSubmitBtn.disabled = false
      bugReportSubmitBtn.textContent = 'Bug melden'
   }
})

/*=============== ADMIN PANEL – BUG REPORTS ===============*/
function getVisibleBugReports(reports, targetUsername = '') {
   const normalizedTargetUsername = typeof targetUsername === 'string'
      ? targetUsername.trim().toLowerCase()
      : ''

   const allReports = Array.isArray(reports) ? reports : []
   if (!normalizedTargetUsername) return allReports

   return allReports.filter((report) => {
      const reportUsername = typeof report?.username === 'string' ? report.username.trim().toLowerCase() : ''
      return reportUsername === normalizedTargetUsername
   })
}

function createAdminBugReportItem(report, viewerIsAdministrator, targetUsername) {
   const isClosed = report.closed === 1
   const item = document.createElement('div')
   item.className = 'admin-reports__item' + (isClosed ? ' admin-reports__item--closed' : '')

   const itemHeader = document.createElement('div')
   itemHeader.className = 'admin-reports__item-header'

   const reporter = document.createElement('button')
   reporter.type = 'button'
   reporter.className = 'admin-reports__reporter admin-reports__reporter-button'
   reporter.textContent = report.full_name
      ? `${report.full_name} (@${report.username || 'unbekannt'})`
      : `@${report.username || 'unbekannt'}`

   if (report.username) {
      reporter.addEventListener('click', async () => {
         await openPublicProfileByUsername(report.username)
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
   reason.textContent = report.description || 'Keine Beschreibung angegeben.'

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
            const response = await fetch(`/api/auth/admin/bug-reports/${report.id}/close`, {
               method: 'PATCH',
               credentials: 'include'
            })

            if (response.ok) {
               loadAdminBugReports(targetUsername)
            } else {
               showMsg('admin-reports-message', 'Bug Report konnte nicht geschlossen werden.', 'error')
               closeBtn.disabled = false
               closeBtn.textContent = 'Fall schließen'
            }
         } catch {
            showMsg('admin-reports-message', 'Server nicht erreichbar.', 'error')
            closeBtn.disabled = false
            closeBtn.textContent = 'Fall schließen'
         }
      })
      item.appendChild(closeBtn)
   }

   return item
}

async function loadAdminBugReports(targetUsername = '') {
   try {
      const response = await fetch('/api/auth/admin/bug-reports', {
         credentials: 'include'
      })
      if (!response.ok) {
         showMsg('admin-reports-message', 'Bug Reports konnten nicht geladen werden.', 'error')
         return
      }

      const data = await response.json()
      adminBugReportsList.innerHTML = ''
      const viewerIsAdministrator = isAdminUser(currentUser)
      const visibleReports = getVisibleBugReports(data.reports, targetUsername)

      if (!visibleReports.length) {
         adminBugReportsList.innerHTML = '<p class="admin-reports__empty">Keine Bug Reports vorhanden.</p>'
         return
      }

      visibleReports.forEach((report) => {
         adminBugReportsList.appendChild(createAdminBugReportItem(report, viewerIsAdministrator, targetUsername))
      })
   } catch (_) {
      showMsg('admin-reports-message', 'Serverfehler beim Laden der Bug Reports.', 'error')
   }
}

// Admin reports tab handling
if (adminReportsTabMeldungen && adminReportsTabEntbannungen) {
   adminReportsTabMeldungen.addEventListener('click', async () => {
      if (!currentAdminReportsUsername) return
      await openAdminReports(currentAdminReportsUsername, 'meldungen')
   })

   adminReportsTabEntbannungen.addEventListener('click', async () => {
      if (!currentAdminReportsUsername) return
      await openAdminReports(currentAdminReportsUsername, 'entbannungen')
   })
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

function setImprintContactLink(nameLink, emailLink, contact, fallback) {
   if (!nameLink && !emailLink) return

   const displayUser = getDisplayUser(contact, fallback)

   if (nameLink) {
      nameLink.textContent = displayUser.full_name
      nameLink.dataset.publicProfile = displayUser.username || ''
      nameLink.dataset.publicProfileEmail = displayUser.email || ''
      nameLink.dataset.modalTarget = 'public-profile-modal'
   }

   if (emailLink) {
      emailLink.textContent = displayUser.email
      emailLink.href = `mailto:${displayUser.email}`
   }
}

function updateProjectContactModal(contactKey, contact) {
   const config = projectContactConfig[contactKey]
   if (!config) return

   const displayUser = getDisplayUser(contact, config.fallback)
   projectContactsByKey[contactKey] = displayUser

   setImprintContactLink(config.imprintNameLink, config.imprintEmailLink, contact, config.fallback)
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

function canAccessDeveloperPanel(user) {
   if (!user) return false
   return user.is_developer === 1 || user.is_developer === true
}

function updateNavAdminToolsVisibility(user) {
   if (!navAdminToolsBtn) return
   navAdminToolsBtn.style.display = canAccessAdminPanel(user) ? 'inline-flex' : 'none'
}

function updateNavDeveloperToolsVisibility(user) {
   if (!navDeveloperToolsBtn) return
   navDeveloperToolsBtn.style.display = canAccessDeveloperPanel(user) ? 'inline-flex' : 'none'
}

function getDefaultAccentColor() {
   const cssValue = getComputedStyle(document.documentElement).getPropertyValue('--first-color').trim()
   if (/^#[0-9A-Fa-f]{6}$/.test(cssValue)) return cssValue.toUpperCase()
   return '#3379AC'
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

function normalizeAvatarArtistUrl(value) {
   if (typeof value !== 'string') return ''
   const trimmed = value.trim()
   if (!trimmed) return ''

   const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

   try {
      const parsedUrl = new URL(candidate)
      const protocol = parsedUrl.protocol.toLowerCase()
      if (protocol !== 'http:' && protocol !== 'https:') return ''
      return parsedUrl.toString()
   } catch (_) {
      return ''
   }
}

function syncProfileAvatarArtistLink(urlValue) {
   const avatarArtistUrl = normalizeAvatarArtistUrl(urlValue)
   profileAvatarButton.dataset.artistUrl = avatarArtistUrl

   if (avatarArtistUrl) {
      profileAvatarButton.setAttribute('href', avatarArtistUrl)
      profileAvatarButton.setAttribute('target', '_blank')
      profileAvatarButton.setAttribute('rel', 'noopener noreferrer')
      profileAvatarButton.title = 'Original vom Artist öffnen'
      return avatarArtistUrl
   }

   profileAvatarButton.removeAttribute('href')
   profileAvatarButton.removeAttribute('target')
   profileAvatarButton.removeAttribute('rel')
   profileAvatarButton.title = 'Profilbild ändern'
   return ''
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
   ;[publicProfileEmailLink, publicProfileEarlySupporter, publicProfileDeveloper, publicProfileZodiac, publicProfileBelief].forEach((element) => {
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

function updatePublicProfileDeveloper() {
   if (!publicProfileDeveloper) return
   publicProfileDeveloper.style.display = 'none'
   publicProfileDeveloper.innerHTML = ''
   setPublicProfileTooltip(publicProfileDeveloper, '')
   publicProfileDeveloper.setAttribute('aria-label', 'Entwickler*in')
   publicProfileDeveloper.dataset.action = ''
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
   const defaultColor = getDefaultAccentColor()
   const themeColorTag = document.querySelector('meta[name="theme-color"]')
   
   if (!normalizedAccentColor) {
      document.body.classList.remove(USER_THEME_CLASS)
      document.documentElement.style.setProperty('--user-accent-color', defaultColor)
      document.documentElement.style.setProperty('--user-accent-text-color', '#FFF')
      if (themeColorTag) themeColorTag.setAttribute('content', defaultColor)
      return
   }

   document.body.classList.add(USER_THEME_CLASS)
   document.documentElement.style.setProperty('--user-accent-color', normalizedAccentColor)
   document.documentElement.style.setProperty('--user-accent-text-color', getAccentTextColor(normalizedAccentColor))
   if (themeColorTag) themeColorTag.setAttribute('content', normalizedAccentColor)
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

function getStorageUsername(user) {
   const username = user?.username?.trim().toLowerCase()
   return username || null
}

function getBackgroundStorageKey(user) {
   const username = getStorageUsername(user)
   if (!username) return null
   return `${LOCAL_BACKGROUND_STORAGE_PREFIX}${username}`
}

function getCursorStorageKey(user, kind = 'cursor') {
   const username = getStorageUsername(user)
   if (!username) return null

   const normalizedKind = kind === 'pointer' ? 'pointer' : 'cursor'
   const prefix = normalizedKind === 'pointer'
      ? LOCAL_POINTER_STORAGE_PREFIX
      : LOCAL_CURSOR_STORAGE_PREFIX

   return `${prefix}${username}`
}

function applyMainBackground(source) {
   if (!mainContainer) return

   if (source) {
      mainContainer.style.backgroundImage = `url("${source}")`
      return
   }

   mainContainer.style.backgroundImage = DEFAULT_MAIN_BACKGROUND_SRC
}

function applyUserCursor(cursorSource, pointerSource) {
   if (cursorSource) {
      document.documentElement.style.setProperty('--app-cursor-main', `url("${cursorSource}") 8 8, auto`)
   } else {
      // Remove overrides so the stylesheet defaults (with proper asset paths) take effect
      document.documentElement.style.removeProperty('--app-cursor-main')
   }

   if (pointerSource) {
      document.documentElement.style.setProperty('--app-cursor-pointer', `url("${pointerSource}") 8 8, pointer`)
   } else {
      // Remove overrides so the stylesheet defaults (with proper asset paths) take effect
      document.documentElement.style.removeProperty('--app-cursor-pointer')
   }
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

function getStoredCursorForUser(user, kind = 'cursor') {
   const storageKey = getCursorStorageKey(user, kind)
   if (!storageKey) return null

   try {
      const storedValue = localStorage.getItem(storageKey)
      if (typeof storedValue === 'string' && storedValue.startsWith('data:')) {
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

function saveCursorForCurrentUser(kind, dataUrl) {
   const storageKey = getCursorStorageKey(currentUser, kind)
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

function clearCursorForCurrentUser(kind) {
   const storageKey = getCursorStorageKey(currentUser, kind)
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

function applyStoredCursorForUser(user) {
   const storedCursor = getStoredCursorForUser(user, 'cursor')
   const storedPointer = getStoredCursorForUser(user, 'pointer')
   applyUserCursor(storedCursor, storedPointer)
}

function updateBackgroundControls(user) {
   if (!profileBackgroundResetBtn) return

   const hasCustomBackground = Boolean(getStoredBackgroundForUser(user))
   profileBackgroundResetBtn.disabled = !hasCustomBackground
   profileBackgroundResetBtn.textContent = hasCustomBackground
      ? 'Hintergrund zurücksetzen'
      : 'Kein eigener Hintergrund'
}

function updateCursorControls(user) {
   const hasCustomCursor = Boolean(getStoredCursorForUser(user, 'cursor'))
   const hasCustomPointer = Boolean(getStoredCursorForUser(user, 'pointer'))

   if (profileCursorResetBtn) {
      profileCursorResetBtn.disabled = !hasCustomCursor
      profileCursorResetBtn.textContent = hasCustomCursor
         ? 'Cursor zurücksetzen'
         : 'Kein eigener Cursor'
   }

   if (profilePointerResetBtn) {
      profilePointerResetBtn.disabled = !hasCustomPointer
      profilePointerResetBtn.textContent = hasCustomPointer
         ? 'Pointer zurücksetzen'
         : 'Kein eigener Pointer'
   }

   if (!profileCursorInput?.value) {
      setCursorFilenameLabel('cursor', hasCustomCursor ? 'Lokaler Cursor aktiv' : '')
   }

   if (!profilePointerInput?.value) {
      setCursorFilenameLabel('pointer', hasCustomPointer ? 'Lokaler Pointer aktiv' : '')
   }
}

function setBackgroundFilenameLabel(fileName = '') {
   if (!profileBackgroundFilename) return
   profileBackgroundFilename.textContent = fileName || 'Kein Bild ausgewählt'
}

function setCursorFilenameLabel(kind, fileName = '') {
   const isPointer = kind === 'pointer'
   const targetElement = isPointer ? profilePointerFilename : profileCursorFilename
   if (!targetElement) return

   const fallbackLabel = isPointer
      ? 'Keine Pointer-Datei ausgewählt'
      : 'Keine Cursor-Datei ausgewählt'

   targetElement.textContent = fileName || fallbackLabel
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
   updatePublicProfileDeveloper(Boolean(user?.is_developer))
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

   hidePublicProfileTooltip(publicProfileEmailLink)
   publicProfileEmailLink.style.display = 'none'
   publicProfileEmailLink.href = '#'
   publicProfileEmailLink.innerHTML = '<i class="fi fi-rc-envelope"></i>'
   publicProfileEmailLink.dataset.action = ''
   publicProfileEmailLink.title = 'E-Mail schreiben'
   publicProfileEmailLink.setAttribute('aria-label', 'E-Mail schreiben')
   publicProfileEmailLink.classList.remove('public-profile__action--badge')
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
   updatePublicProfileDeveloper(false)
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

async function openPublicProfileByEmail(email) {
   if (!email) return

   try {
      const response = await fetch(`/api/auth/public-by-email/${encodeURIComponent(email)}`, {
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

         if (viewerIsAdministrator) {
            const developerButton = document.createElement('button')
            developerButton.type = 'button'
            developerButton.className = 'admin-user-list__moderator-toggle'
            developerButton.textContent = user.isDeveloper
               ? 'Entwickler*in degradieren'
               : 'Zu Entwickler*in befördern'

            developerButton.addEventListener('click', async () => {
               developerButton.disabled = true
               try {
                  const response = await fetch(`/api/auth/admin/users/${encodeURIComponent(user.username)}/developer-toggle`, {
                     method: 'PATCH',
                     credentials: 'include'
                  })

                  const data = await response.json()
                  if (!response.ok) {
                     showMsg('admin-user-list-message', data.error || 'Entwickler*innen-Status konnte nicht geändert werden.', 'error')
                     developerButton.disabled = false
                     return
                  }

                  showMsg('admin-user-list-message', data.message || 'Entwickler*innen-Status aktualisiert.', 'success')
                  await loadAdminUserList(adminUserListSearch.value)
               } catch (_) {
                  showMsg('admin-user-list-message', 'Server nicht erreichbar.', 'error')
                  developerButton.disabled = false
               }
            })

            actions.appendChild(developerButton)
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

   adminUserListResults.appendChild(createUserGroup('Nutzernamen', users))
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
   if (shouldAutoFocusSearchInputs()) {
      adminUserListSearch.focus()
   }
}

function renderDeveloperUserList(users, bugReportUsers = []) {
   developerUserListResults.innerHTML = ''

   function createUserGroup(title, userList) {
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

            const bugsButton = document.createElement('button')
            bugsButton.type = 'button'
            bugsButton.className = 'admin-user-list__reports'
            bugsButton.textContent = 'Bugs ansehen'
            bugsButton.addEventListener('click', async () => {
               await openDeveloperBugReports(user.username)
            })

            actions.appendChild(bugsButton)

            menuButton.addEventListener('click', () => {
               developerUserListResults.querySelectorAll('.admin-user-list__actions').forEach((el) => {
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

   developerUserListResults.appendChild(createUserGroup('Bugs', bugReportUsers))
   developerUserListResults.appendChild(createUserGroup('Nutzernamen', users))
}

let developerUserListDebounceTimer = null

async function loadDeveloperUserList(query = '') {
   if (!canAccessDeveloperPanel(currentUser)) {
      return showMsg('developer-user-list-message', 'Kein Zugriff auf den Entwickler*innen-Bereich.', 'error')
   }

   const trimmedQuery = typeof query === 'string' ? query.trim() : ''

   try {
      const usersUrl = trimmedQuery
         ? `/api/auth/admin/developer/users?q=${encodeURIComponent(trimmedQuery)}`
         : '/api/auth/admin/developer/users'

      const [usersResp, bugReportsResp] = await Promise.all([
         fetch(usersUrl, { credentials: 'include' }),
         fetch('/api/auth/admin/developer/bug-reports', { credentials: 'include' })
      ])

      const usersData = await usersResp.json()
      if (!usersResp.ok) {
         showMsg('developer-user-list-message', usersData.error || 'Userliste konnte nicht geladen werden.', 'error')
         renderDeveloperUserList([], [])
         return
      }

      const bugReportsData = bugReportsResp.ok ? await bugReportsResp.json() : { reports: [] }
      const allUsers = Array.isArray(usersData.users) ? usersData.users : []
      const usersByUsername = new Map(
         allUsers
            .filter((user) => user?.username)
            .map((user) => [String(user.username).trim().toLowerCase(), user])
      )

      const seenBugUsernames = new Set()
      const bugReportUsers = (Array.isArray(bugReportsData.reports) ? bugReportsData.reports : [])
         .filter((report) => report?.closed === 0 || report?.closed === false)
         .map((report) => report?.username ? String(report.username).trim().toLowerCase() : '')
         .filter(Boolean)
         .filter((normalizedUsername) => {
            if (seenBugUsernames.has(normalizedUsername)) return false
            seenBugUsernames.add(normalizedUsername)
            return true
         })
         .map((normalizedUsername) => usersByUsername.get(normalizedUsername))
         .filter(Boolean)

      clearMsg('developer-user-list-message')
      renderDeveloperUserList(allUsers, bugReportUsers)
   } catch (_) {
      showMsg('developer-user-list-message', 'Server nicht erreichbar.', 'error')
      renderDeveloperUserList([], [])
   }
}

async function openDeveloperUserListModal() {
   if (!canAccessDeveloperPanel(currentUser)) {
      return showPublicProfileNotice('Kein Zugriff auf den Entwickler*innen-Bereich.', 'error', 3000)
   }

   developerUserListSearch.value = ''
   clearMsg('developer-user-list-message')
   renderDeveloperUserList([], [])

   hideAll()
   developerUserListModal.classList.add('show-search')
   await loadDeveloperUserList('')
   if (shouldAutoFocusSearchInputs()) {
      developerUserListSearch.focus()
   }
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
   const avatarArtistUrl = syncProfileAvatarArtistLink(user?.avatar_artist_url)
   profileAvatarArtistUrlInput.value = avatarArtistUrl
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
   updateCursorControls(user)
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

function startRestrictionCheck() {
   if (restrictionCheckInterval) return

   let lastRestrictionStatus = currentUser?.is_restricted ? 1 : 0

   restrictionCheckInterval = setInterval(async () => {
      try {
         const response = await fetch('/api/auth/me', { credentials: 'include' })
         if (!response.ok) return

         const data = await response.json()
         const currentRestrictionStatus = data.user?.is_restricted ? 1 : 0

         if (lastRestrictionStatus === 0 && currentRestrictionStatus === 1) {
            currentUser = data.user
            hideAll()
            unbanRequestReasonInput.value = ''
            updateCounter(unbanRequestReasonCounter, '', 500)
            clearMsg('unban-request-message')
            unbanRequestModal.classList.add('show-login')
         }

         lastRestrictionStatus = currentRestrictionStatus
         currentUser = data.user
      } catch (err) {
         console.error('[RESTRICTION CHECK ERROR]', err)
      }
   }, 4000)
}

function stopRestrictionCheck() {
   if (restrictionCheckInterval) {
      clearInterval(restrictionCheckInterval)
      restrictionCheckInterval = null
   }
}

function setLoggedIn(user) {
   currentUser = user
   applyUserAccentColor(user?.accent_color)
   applyStoredBackgroundForUser(user)
   applyStoredCursorForUser(user)
   updateNavAdminToolsVisibility(user)
   updateNavDeveloperToolsVisibility(user)
   loginBtn.style.display   = 'none'
   navUser.style.display    = 'flex'
   navAvatar.src = getAvatarUrl(user)
   if (distroRatingOpenBtn) {
      distroRatingOpenBtn.style.display = currentDistroKey ? 'inline-flex' : 'none'
   }
   updateDistroBookmarkButtonState()
   loadSavedDistros()
   updateProfileView(user)
   refreshProjectContacts()
   startRestrictionCheck()
}

function setLoggedOut() {
   stopRestrictionCheck()
   currentUser = null
   applySavedDistrosPayload({ savedDistros: [] })
   applyUserAccentColor(null)
   applyMainBackground(null)
   applyUserCursor(null, null)
   updateNavAdminToolsVisibility(null)
   updateNavDeveloperToolsVisibility(null)
   loginBtn.style.display  = ''
   navUser.style.display   = 'none'
    if (distroRatingOpenBtn) {
       distroRatingOpenBtn.style.display = 'none'
    }
   updateDistroBookmarkButtonState()
   navAvatar.src           = ''
   profileAvatarImage.src  = ''
   profileFullNameInput.value = ''
   profileDisplayNameInput.value = ''
   updateDisplayNameCounter('')
   profilePronounsInput.value = ''
   updatePronounsCounter('')
   profileBioInput.value = ''
   updateBioCounter('')
   profileAvatarArtistUrlInput.value = ''
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
   syncProfileAvatarArtistLink('')
   profileShareLinkInput.value = ''
   if (profileBackgroundInput) {
      profileBackgroundInput.value = ''
   }
   if (profileCursorInput) {
      profileCursorInput.value = ''
   }
   if (profilePointerInput) {
      profilePointerInput.value = ''
   }
   setBackgroundFilenameLabel('')
   setCursorFilenameLabel('cursor', '')
   setCursorFilenameLabel('pointer', '')
   updateBackgroundControls(null)
   updateCursorControls(null)
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

;[publicProfileEmailLink, publicProfileEarlySupporter, publicProfileDeveloper, publicProfileZodiac, publicProfileBelief].forEach((element) => {
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

if (publicProfileDeveloper) {
   publicProfileDeveloper.addEventListener('click', async (event) => {
      const canOpenDeveloperList = publicProfileDeveloper.dataset.action === 'open-developer-list'

      if (hasTouchTooltipInteraction()) {
         event.preventDefault()

         const tooltipVisible = publicProfileDeveloper.classList.contains('is-tooltip-visible')
         if (!tooltipVisible) {
            showPublicProfileTooltip(publicProfileDeveloper, { autoHide: !canOpenDeveloperList })
            return
         }

         if (!canOpenDeveloperList) {
            showPublicProfileTooltip(publicProfileDeveloper, { autoHide: true })
            return
         }

         hidePublicProfileTooltip(publicProfileDeveloper)
         await openDeveloperUserListModal()
         return
      }

      if (!canOpenDeveloperList) {
         event.preventDefault()
         showPublicProfileTooltip(publicProfileDeveloper, { autoHide: false })
         return
      }

      event.preventDefault()
      await openDeveloperUserListModal()
   })
}

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

developerUserListSearch.addEventListener('input', () => {
   if (developerUserListDebounceTimer) {
      clearTimeout(developerUserListDebounceTimer)
   }

   developerUserListDebounceTimer = setTimeout(() => {
      loadDeveloperUserList(developerUserListSearch.value)
   }, 200)
})

developerUserListForm.addEventListener('submit', (event) => {
   event.preventDefault()
   loadDeveloperUserList(developerUserListSearch.value)
})

async function openSharedProfileFromUrl() {
   const sharedUsername = getSharedUsernameFromPath()
   if (!sharedUsername) return

   await openPublicProfileByUsername(sharedUsername)
}

profileBtn.addEventListener('click', showProfileModal)
profileAvatarButton.addEventListener('click', () => {
   profileAvatarInput.click()
})
profileAvatarArtistUrlInput.addEventListener('input', () => {
   syncProfileAvatarArtistLink(profileAvatarArtistUrlInput.value)
})
publicProfileAvatar.addEventListener('click', () => {
   if (currentPublicProfileUser?.avatar_artist_url) {
      window.open(currentPublicProfileUser.avatar_artist_url, '_blank', 'noopener,noreferrer')
   }
})
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

function isSupportedCursorFile(file) {
   if (!file) return false
   if (typeof file.type === 'string' && file.type.startsWith('image/')) return true

   const lowerName = String(file.name || '').trim().toLowerCase()
   return lowerName.endsWith('.cur') || lowerName.endsWith('.png')
}

function readAndStoreLocalCursorFile(kind, file, inputElement, pickButton, resetButton) {
   if (!file || !currentUser) return

   const isPointer = kind === 'pointer'
   const readableKind = isPointer ? 'Pointer' : 'Cursor'

   clearMsg('profile-message')
   inputElement.disabled = true
   pickButton.disabled = true
   resetButton.disabled = true

   const reader = new FileReader()
   reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''

      if (!dataUrl.startsWith('data:')) {
         showMsg('profile-message', `Ungültige ${readableKind}-Datei.`, 'error')
      } else if (dataUrl.length > LOCAL_CURSOR_MAX_DATA_URL_LENGTH) {
         showMsg('profile-message', `${readableKind}-Datei ist zu groß für die lokale Speicherung.`, 'error')
      } else if (!saveCursorForCurrentUser(kind, dataUrl)) {
         showMsg('profile-message', 'Lokaler Speicher voll oder blockiert. Bitte kleinere Datei wählen.', 'error')
      } else {
         applyStoredCursorForUser(currentUser)
         updateCursorControls(currentUser)
         showMsg('profile-message', `Lokaler ${readableKind} gespeichert.`, 'success')
      }

      inputElement.value = ''
      inputElement.disabled = false
      pickButton.disabled = false
      resetButton.disabled = false
   }

   reader.onerror = () => {
      showMsg('profile-message', `${readableKind}-Datei konnte nicht gelesen werden.`, 'error')
      inputElement.value = ''
      setCursorFilenameLabel(kind, '')
      inputElement.disabled = false
      pickButton.disabled = false
      resetButton.disabled = false
   }

   reader.readAsDataURL(file)
}

profileCursorPickBtn.addEventListener('click', () => {
   if (!currentUser) {
      return showMsg('profile-message', 'Bitte melde dich an, um einen lokalen Cursor zu verwenden.', 'error')
   }

   clearMsg('profile-message')
   profileCursorInput.click()
})

profilePointerPickBtn.addEventListener('click', () => {
   if (!currentUser) {
      return showMsg('profile-message', 'Bitte melde dich an, um einen lokalen Pointer zu verwenden.', 'error')
   }

   clearMsg('profile-message')
   profilePointerInput.click()
})

profileCursorInput.addEventListener('change', () => {
   const cursorFile = profileCursorInput.files[0]
   if (!cursorFile) return

   setCursorFilenameLabel('cursor', cursorFile.name)

   if (!currentUser) {
      profileCursorInput.value = ''
      setCursorFilenameLabel('cursor', '')
      return showMsg('profile-message', 'Bitte melde dich an, um einen lokalen Cursor zu verwenden.', 'error')
   }

   if (!isSupportedCursorFile(cursorFile)) {
      profileCursorInput.value = ''
      setCursorFilenameLabel('cursor', '')
      return showMsg('profile-message', 'Bitte wähle eine gültige Cursor-Datei (.cur oder Bilddatei, z. B. PNG).', 'error')
   }

   if (cursorFile.size > 8 * 1024 * 1024) {
      profileCursorInput.value = ''
      setCursorFilenameLabel('cursor', '')
      return showMsg('profile-message', 'Cursor-Datei ist zu groß (max. 8 MB).', 'error')
   }

   readAndStoreLocalCursorFile('cursor', cursorFile, profileCursorInput, profileCursorPickBtn, profileCursorResetBtn)
})

profilePointerInput.addEventListener('change', () => {
   const pointerFile = profilePointerInput.files[0]
   if (!pointerFile) return

   setCursorFilenameLabel('pointer', pointerFile.name)

   if (!currentUser) {
      profilePointerInput.value = ''
      setCursorFilenameLabel('pointer', '')
      return showMsg('profile-message', 'Bitte melde dich an, um einen lokalen Pointer zu verwenden.', 'error')
   }

   if (!isSupportedCursorFile(pointerFile)) {
      profilePointerInput.value = ''
      setCursorFilenameLabel('pointer', '')
      return showMsg('profile-message', 'Bitte wähle eine gültige Pointer-Datei (.cur oder Bilddatei, z. B. PNG).', 'error')
   }

   if (pointerFile.size > 8 * 1024 * 1024) {
      profilePointerInput.value = ''
      setCursorFilenameLabel('pointer', '')
      return showMsg('profile-message', 'Pointer-Datei ist zu groß (max. 8 MB).', 'error')
   }

   readAndStoreLocalCursorFile('pointer', pointerFile, profilePointerInput, profilePointerPickBtn, profilePointerResetBtn)
})

profileCursorResetBtn.addEventListener('click', () => {
   if (!currentUser) return

   const removed = clearCursorForCurrentUser('cursor')
   if (!removed) {
      return showMsg('profile-message', 'Lokaler Cursor konnte nicht entfernt werden.', 'error')
   }

   applyStoredCursorForUser(currentUser)
   updateCursorControls(currentUser)
   showMsg('profile-message', 'Lokaler Cursor entfernt.', 'success')
})

profilePointerResetBtn.addEventListener('click', () => {
   if (!currentUser) return

   const removed = clearCursorForCurrentUser('pointer')
   if (!removed) {
      return showMsg('profile-message', 'Lokaler Pointer konnte nicht entfernt werden.', 'error')
   }

   applyStoredCursorForUser(currentUser)
   updateCursorControls(currentUser)
   showMsg('profile-message', 'Lokaler Pointer entfernt.', 'success')
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
   const avatar_artist_url_raw = profileAvatarArtistUrlInput.value
   const avatar_artist_url = normalizeAvatarArtistUrl(avatar_artist_url_raw)
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

   if (typeof avatar_artist_url_raw === 'string' && avatar_artist_url_raw.trim() && !avatar_artist_url) {
      return showMsg('profile-message', 'Der Artist-Link muss mit http:// oder https:// beginnen und gültig sein.', 'error')
   }

   if (avatar_artist_url.length > 500) {
      return showMsg('profile-message', 'Der Artist-Link darf maximal 500 Zeichen lang sein.', 'error')
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
         body: JSON.stringify({ full_name, profile_name, pronouns, bio, avatar_artist_url, birth_date, belief, confession, username, accent_color })
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
      const publicProfileEmail = trigger.dataset.publicProfileEmail
      
      if (publicProfileKey || publicProfileEmail) {
         await refreshProjectContacts()
         
         if (publicProfileEmail) {
            await openPublicProfileByEmail(publicProfileEmail)
            return
         }
         
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
profileLogoutBtn.addEventListener('click', async () => {
   await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
   setLoggedOut()
   showLogin()
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




