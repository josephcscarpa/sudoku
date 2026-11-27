export type UiSettings = Readonly<{
  highlightPeers: boolean
  highlightMatching: boolean
  showRemainingCounts: boolean
  alwaysShowCandidates: boolean
  hideCandidatesForGivenDigits: boolean
  autoRemoveCandidates: boolean
  highlightSingleCandidates: boolean
  autoFillSingleCandidates: boolean
  preventGivenContradictions: boolean
  preventAllContradictions: boolean
}>

export const DEFAULT_UI_SETTINGS: UiSettings = {
  highlightPeers: true,
  highlightMatching: true,
  showRemainingCounts: true,
  alwaysShowCandidates: true,
  hideCandidatesForGivenDigits: true,
  autoRemoveCandidates: true,
  highlightSingleCandidates: false,
  autoFillSingleCandidates: false,
  preventGivenContradictions: true,
  preventAllContradictions: true,
}

let activeUiSettings: UiSettings = DEFAULT_UI_SETTINGS

export function setActiveUiSettings(settings: UiSettings): void {
  activeUiSettings = settings
}

export function getActiveUiSettings(): UiSettings {
  return activeUiSettings
}
