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
  const userAddedByCloutMask = pageIdentityUser && !pageIdentityUser['encryptedSeedHex']

  const iconUrl = chrome.runtime.getURL('images/icon.svg')
  const cloutAsButton = document.createElement('button')
  cloutAsButton.id = 'clout-mask-button'
  cloutAsButton.className = 'btn btn-dark btn-sm text-muted fs-14px rounded-pill'

  if (userAddedByCloutMask) {
    cloutAsButton.innerHTML = `<img src="${iconUrl}" width="16" height="16" alt="CloutMask Logo"> Remove from accounts`
    cloutAsButton.onclick = () => removePublicKeyFromIdentityUsers(publicKeyFromPage)
    topBar.appendChild(cloutAsButton)
  } else if (!pageIdentityUser) {
    cloutAsButton.setAttribute('bs-toggle', 'tooltip')
    cloutAsButton.innerHTML = `<img src="${iconUrl}" width="16" height="16" alt="CloutMask Logo">`
    cloutAsButton.title = "Add account with CloutMask"
    cloutAsButton.onclick = () => addPublicKeyToIdentityUsers(publicKeyFromPage)
    topBar.appendChild(cloutAsButton)
  }
}

const appRootObserverCallback = () => {
  const profilePage = document.querySelector('app-creator-profile-page')
  if (profilePage) {
    addCloutMaskButton(profilePage)
  }
}

const init = () => {
  const appRoot = document.querySelector('app-root')
  if (appRoot) {
    const appRootObserverConfig = {childList: true, subtree: true}
    const appRootObserver = new MutationObserver(appRootObserverCallback)
    appRootObserver.observe(appRoot, appRootObserverConfig)
  }
}

init()
