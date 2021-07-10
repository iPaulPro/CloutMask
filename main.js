"use strict"

const getLoggedInPublicKey = function () {
  const key = window.localStorage.getItem('lastLoggedInUser')
  if (!key) return undefined
  return JSON.parse(key)
}

const getIdentityUsers = () => {
  let users = window.localStorage.getItem('identityUsers')
  if (!users) return undefined
  return JSON.parse(users)
}

const getLoggedInIdentityUser = () => {
  let identityUsers = getIdentityUsers()
  if (identityUsers) return identityUsers[getLoggedInPublicKey()]
  return undefined
}

const isMaskedUser = (identityUser) => {
  return identityUser && identityUser['encryptedSeedHex'] === undefined
}

const isLoggedInAsMaskedUser = () => {
  const loggedInIdentityUser = getLoggedInIdentityUser()
  if (loggedInIdentityUser) return isMaskedUser(loggedInIdentityUser)
  return undefined
}

const getPublicKeyFromPage = (page) => {
  const keyElement = page.querySelector('.creator-profile__ellipsis-restriction')
  if (!keyElement) return undefined
  return keyElement.innerText.trim()
}

const addPublicKeyToIdentityUsers = (key) => {
  const identityUsers = getIdentityUsers()
  if (!identityUsers || identityUsers[key]) return

  identityUsers[key] = {"network": "mainnet"}
  window.localStorage.setItem('identityUsers', JSON.stringify(identityUsers))
  window.localStorage.setItem('lastLoggedInUser', `"${key}"`)

  window.location.reload()
}

const removePublicKeyFromIdentityUsers = (key) => {
  const identityUsers = getIdentityUsers()
  if (!identityUsers || identityUsers[key]['encryptedSeedHex']) return

  try {
    delete identityUsers[key]
    window.localStorage.setItem('identityUsers', JSON.stringify(identityUsers))
  } catch (e) {
    return
  }

  if (key === getLoggedInPublicKey()) {
    const firstKey = Object.keys(identityUsers)[0]
    if (firstKey) {
      window.localStorage.setItem('lastLoggedInUser', `"${firstKey}"`)
    }
  }

  window.location.reload()
}

const createCloutMaskIconElement = () => {
  const environment = chrome || browser
  if (!environment) return
  const iconUrl = environment.runtime.getURL('images/icon.svg')
  const img = document.createElement('img')
  img.width = 16
  img.height = 16
  img.alt = "CloutMask Logo"
  img.src = iconUrl
  return img
}

const addCloutMaskButton = (page) => {
  if (!page || page.querySelector('#clout-mask-button')) return

  const publicKeyFromPage = getPublicKeyFromPage(page)
  if (!publicKeyFromPage) return

  const topBar = page.querySelector('.creator-profile__top-bar')
  if (!topBar) return

  topBar.style.justifyContent = 'flex-end'
  topBar.style.alignItems = 'center'

  const identityUsers = getIdentityUsers()
  const pageIdentityUser = identityUsers[publicKeyFromPage]
  const userAddedByCloutMask = isMaskedUser(pageIdentityUser)

  const icon = createCloutMaskIconElement().outerHTML
  const cloutAsButton = document.createElement('button')
  cloutAsButton.id = 'clout-mask-button'
  cloutAsButton.className = 'btn btn-dark btn-sm text-muted fs-14px rounded-pill'

  if (userAddedByCloutMask) {
    cloutAsButton.innerHTML = `${icon} Remove account`
    cloutAsButton.onclick = () => removePublicKeyFromIdentityUsers(publicKeyFromPage)
    topBar.appendChild(cloutAsButton)
  } else if (!pageIdentityUser) {
    cloutAsButton.setAttribute('bs-toggle', 'tooltip')
    cloutAsButton.innerHTML = icon
    cloutAsButton.title = "Add account with CloutMask"
    cloutAsButton.onclick = () => addPublicKeyToIdentityUsers(publicKeyFromPage)
    topBar.appendChild(cloutAsButton)
  }
}

const disableFeedPostButtons = () => {
  const iconRows = document.querySelectorAll('.js-feed-post-icon-row__container')
  iconRows.forEach((row) => {
    const postButtons = Array.from(row.children)
    postButtons.splice(postButtons.length - 1, 1)
    postButtons.forEach((button) => {
      button.style.opacity = '0.5'
      button.style.pointerEvents = 'none'
    })
  })
}

const disableElement = (element) => {
  if (!element || !element.style) return
  element.style.opacity = '0.5'
  element.style.pointerEvents = 'none'
  element.disabled = true
};

const disableAll = (elements) => {
  disableElement(elements)
}

const disableKnownLinks = () => {
  const anchors = document.querySelectorAll(
    "a[href*='/buy'], a[href*='/sell'], a[href*='/transfer'], a[href*='/select-creator-coin'], a[href*='/send-bitclout'], a[href*='/inbox'], a[href*='/settings'], a[href*='/buy-bitclout'], a[href*='/admin']"
  )
  anchors.forEach(disableAll)
}

const disableClasses = () => {
  const elements = document.querySelectorAll('.feed-create-post__textarea, .update-profile__image-delete, feed-post-dropdown, app-update-profile-page .btn-primary')
  elements.forEach(disableAll)
}

const disablePostButtons = () => {
  const createPostElement = document.querySelector('feed-create-post')
  if (createPostElement) {
    const postButton = createPostElement.querySelector('.btn-primary')
    disableElement(postButton)
  }
}

const disableFollowButtons = (mutationsList) => {
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      const node = mutation.target
      if ((node.innerText === 'Unfollow' || node.innerText === 'Follow')) {
        disableElement(node)
      }
    }
  }
}

const addMaskToAccountSelector = () => {
  const accountSelectorMaskIconId = '__clout-mask-account-selector-id'
  if (document.getElementById(accountSelectorMaskIconId)) return
  const accountName = document.querySelector('.change-account-selector__ellipsis-restriction')
  const text = accountName.innerText
  const icon = createCloutMaskIconElement()
  icon.id = accountSelectorMaskIconId

  accountName.innerHTML = `${icon.outerHTML} ${text}`
}

const appRootObserverCallback = (mutationsList) => {
  if (isLoggedInAsMaskedUser()) {
    disableFollowButtons(mutationsList)
    disableFeedPostButtons()
    disableKnownLinks()
    disableClasses()
    disablePostButtons()
  }

  const profilePage = document.querySelector('app-creator-profile-page')
  if (profilePage) {
    addCloutMaskButton(profilePage)
  }
}

const bodyObserverCallback = () => {
  if (isLoggedInAsMaskedUser()) {
    addMaskToAccountSelector()
  }
}

const init = () => {
  const appRoot = document.querySelector('app-root')
  if (appRoot) {
    const appRootObserverConfig = {childList: true, subtree: true}
    const appRootObserver = new MutationObserver(appRootObserverCallback)
    appRootObserver.observe(appRoot, appRootObserverConfig)
  }

  const body = document.querySelector('body')
  if (body) {
    const bodyObserverConfig = { childList: true, subtree: false }
    const bodyObserver = new MutationObserver(bodyObserverCallback)
    bodyObserver.observe(body, bodyObserverConfig)
  }
}

init()
