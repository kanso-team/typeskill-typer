/* eslint-disable @typescript-eslint/no-explicit-any */
import { TextInput } from 'react-native'
import React from 'react'
// Test renderer must be required after react-native.
import renderer from 'react-test-renderer'
import { Document } from '@model/Document'
import { Bridge } from '@core/Bridge'
import { TextBlock } from '@model/TextBlock'
import { RichText } from '@components/RichText'
import {
  TextBlockController,
  INVARIANT_MANDATORY_TEXT_BLOCK_PROP,
  TextBlockControllerProps,
} from '@components/TextBlockController'
import { mockSelectionChangeEvent, flattenTextChild } from '@test/vdom'

function buildDocumentConsumer() {
  const bridge = new Bridge()
  const document = new Document()
  const handleOnDocumentStateUpdate = () => ({
    /** */
  })
  const getDelta = () => document.getActiveBlock().getDelta()
  const docConsumer: Document.Consumer = {
    handleOnDocumentStateUpdate,
    sheetEventDom: bridge.getSheetEventDomain(),
  }
  return {
    bridge,
    document,
    docConsumer,
    handleOnDocumentStateUpdate,
    getDelta,
  }
}

function getTextInputDefaultProps(): TextBlockControllerProps {
  const bridge = new Bridge()
  const document = new Document()
  document.registerConsumer({
    handleOnDocumentStateUpdate: () => ({}),
    sheetEventDom: bridge.getSheetEventDomain(),
  })
  return {
    block: document.getActiveBlock() as TextBlock,
  }
}

// Running jest.runAllTimers synchronously causes a bug
// were react component are not always rerendered
// after those timers end.
// See: https://git.io/fjzbL
async function runAllTimers() {
  return Promise.resolve().then(() => jest.runAllTimers())
}

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.clearAllMocks()
  jest.clearAllTimers()
})

describe('@components/<TextBlockController>', () => {
  it('should throw when document has not registered a consumer yet', () => {
    expect(() => {
      renderer.create(<TextBlockController block={undefined as any} />)
    }).toThrowError(INVARIANT_MANDATORY_TEXT_BLOCK_PROP)
  })
  it('renders without crashing', () => {
    const textInput = renderer.create(<TextBlockController {...getTextInputDefaultProps()} />)
    expect(textInput).toBeTruthy()
  })
  it('has a <TextInput> child', () => {
    const wrapper = renderer.create(<TextBlockController {...getTextInputDefaultProps()} />)
    expect(wrapper.root.findByType(TextInput)).toBeTruthy()
  })
  it('should update selection appropriately', async () => {
    const { document, bridge, docConsumer } = buildDocumentConsumer()
    document.registerConsumer(docConsumer)
    const block = document.getActiveBlock() as TextBlock
    const listenerObj = {
      listener: () => ({}),
    }
    const spy = jest.spyOn(listenerObj, 'listener')
    bridge.getControlEventDomain().addSelectedAttributesChangeListener(listenerObj, spy as any)
    const wrapper = renderer.create(<TextBlockController block={block} />)
    const textBlockController = wrapper.root.instance as TextBlockController
    textBlockController['handleOnSheetDomainSelectionChange'](mockSelectionChangeEvent(0, 1))
    await runAllTimers()
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('should comply with DocumentDelta when text updates', async () => {
    const { document, docConsumer, getDelta } = buildDocumentConsumer()
    document.registerConsumer(docConsumer)
    const block = document.getActiveBlock() as TextBlock
    const wrapper = renderer.create(<TextBlockController block={block} />)
    const textBlockController = (wrapper.getInstance() as unknown) as TextBlockController
    expect(textBlockController).toBeInstanceOf(TextBlockController)
    textBlockController['handleOnSheetDomainTextChanged']('This is nu text')
    await textBlockController['handleOnSheetDomainSelectionChange'](mockSelectionChangeEvent(15, 15))
    expect(getDelta().ops).toEqual([{ insert: 'This is nu text\n' }])
  })
  it('should stay in sync with textBlock', async () => {
    const { document, docConsumer } = buildDocumentConsumer()
    document.registerConsumer(docConsumer)
    const block = document.getActiveBlock() as TextBlock
    const wrapper = renderer.create(<TextBlockController block={block} />)
    const textBlockController = (wrapper.getInstance() as unknown) as TextBlockController
    expect(textBlockController).toBeInstanceOf(TextBlockController)
    textBlockController['handleOnSheetDomainTextChanged']('This is nu text\nBlah')
    textBlockController['handleOnSheetDomainSelectionChange'](mockSelectionChangeEvent(20, 20))
    wrapper.update(<TextBlockController block={block} />)
    await runAllTimers()
    wrapper.update(<TextBlockController block={block} />)
    const richText = wrapper.root.findByType(RichText)
    const text = flattenTextChild(richText)
    expect(text.join('')).toEqual('This is nu text\nBlah')
  })
})
