import { NativeSyntheticEvent, TextInputSelectionChangeEventData } from 'react-native'
import { TextChangeSession } from './TextChangeSession'
import { DocumentDeltaAtomicUpdate } from '@delta/DocumentDeltaAtomicUpdate'
import { Selection, SelectionShape } from '@delta/Selection'
import { TextOp } from '@delta/operations'
import { DocumentDelta } from '@delta/DocumentDelta'
import { Attributes } from '@delta/attributes'

export interface TextChangeSessionOwner {
  getTextChangeSession: () => TextChangeSession | null
  setTextChangeSession: (textChangeSession: TextChangeSession | null) => void
  updateOps: (documentDeltaUpdate: DocumentDeltaAtomicUpdate) => void
  getBlockScopedSelection: () => SelectionShape | null
  getOps: () => TextOp[]
  getAttributesAtCursor: () => Attributes.Map
  updateSelection: (selection: SelectionShape) => void
  clearTimeout: () => void
  setTimeout: (callback: () => void, duration: number) => void
}

export interface TextChangeSessionBehavior {
  handleOnTextChanged: (owner: TextChangeSessionOwner, nextText: string) => void
  handleOnSelectionChanged: (
    owner: TextChangeSessionOwner,
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => void
}

function applySelectionChange(owner: TextChangeSessionOwner, textChangeSession: TextChangeSession) {
  const ops = owner.getOps()
  const documentDeltaUpdate = new DocumentDelta(ops).applyTextDiff(
    textChangeSession.getTextAfterChange(),
    textChangeSession.getDeltaChangeContext(),
    owner.getAttributesAtCursor(),
  )
  owner.setTextChangeSession(null)
  owner.updateOps(documentDeltaUpdate)
}

const commonBehavior: TextChangeSessionBehavior = {
  handleOnTextChanged(owner, nextText) {
    const textChangeSession = new TextChangeSession()
    textChangeSession.setTextAfterChange(nextText)
    textChangeSession.setSelectionBeforeChange(owner.getBlockScopedSelection() as Selection)
    owner.setTextChangeSession(textChangeSession)
  },
  handleOnSelectionChanged(owner, { nativeEvent: { selection } }) {
    const nextSelection = Selection.between(selection.start, selection.end)
    const textChangeSession = owner.getTextChangeSession()
    if (textChangeSession !== null) {
      textChangeSession.setSelectionAfterChange(nextSelection)
      applySelectionChange(owner, textChangeSession)
    } else {
      owner.updateSelection(nextSelection)
    }
  },
}

/**
 * As of RN72 on iOS, text changes happens before selection change.
 */
export const iosTextChangeSessionBehavior: TextChangeSessionBehavior = commonBehavior

/**
 * As of RN72 on Android, text changes happens before selection change.
 */
export const androidTextChangeSessionBehavior: TextChangeSessionBehavior = commonBehavior
