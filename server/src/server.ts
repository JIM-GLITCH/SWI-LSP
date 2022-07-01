/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------- */
import {
	DocumentUri,
	Position,
	TextDocument
} from 'vscode-languageserver-textdocument'
import {
	CallHierarchyIncomingCall,
	CallHierarchyIncomingCallsRequest,
	CallHierarchyItem,
	CallHierarchyOutgoingCall,
	CompletionItem,
	CompletionItemKind, createConnection, Diagnostic, DidChangeConfigurationNotification, DocumentSymbol, InitializeParams, InitializeResult, Location, LocationLink, ProposedFeatures, Range, SymbolKind, TextDocumentIdentifier, TextDocumentPositionParams, TextDocuments, TextDocumentSyncKind
} from 'vscode-languageserver/node'
import { AST } from './AST'
import { Node } from './astNode'
import { FileState } from './fileState'
import { Parser } from './parser'
import child_process = require('child_process')
import path = require('path')
import {G} from "./globalVars"
export {
	localDiagnostics,
	PrologLibPath,
	validateTextDocument
}
const g =G.getInstance()
const fileStateMap = g.fileStateMap;


/** 用来收集 diagnostics ( error, warning, hint, information ) 然后再发出去 */
let localDiagnostics: Diagnostic[] = []
let PrologLibPath = (() => {
	if (process.platform === "win32") {
		let swiplPath = child_process.execSync("where.exe swipl").toString()
		const swiplHomePath = swiplPath.split("\\").slice(0, -2)
		return path.join(...swiplHomePath, "library")
	}
})() 

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all)

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

let hasConfigurationCapability = true
let hasWorkspaceFolderCapability = false
let hasDiagnosticRelatedInformationCapability = false

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	// hasConfigurationCapability = !!(
	// 	capabilities.workspace && !!capabilities.workspace.configuration
	// );

	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	)
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	)

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			},
			documentSymbolProvider: true,
			definitionProvider: true,
			hoverProvider: true,
			referencesProvider: true,
			callHierarchyProvider: {

			},

		}
	}
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		}
	}
	return result
})

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined)
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.')
		})
	}
})

// The example settings
interface ExampleSettings {
	sendDiagnostics: string
	maxNumberOfProblems: number
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings = {
	maxNumberOfProblems: 1000,
	sendDiagnostics: "true",
}
let globalSettings: ExampleSettings = defaultSettings

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map()

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear()
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		)
	}

	// Revalidate all open text documents
	// documents.all().forEach(validateTextDocument);
})

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings)
	}
	let result = documentSettings.get(resource)
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'swi-lsp',
		})
		documentSettings.set(resource, result)
	}
	return result
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri)
})

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document)
})

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri)
	const text = textDocument.getText()
	const textDocumentUri = textDocument.uri
	const fileState = new FileState(textDocument)

	localDiagnostics = [];
	(new Parser(fileState)).parseTextWithState(text)
	fileStateMap.set(textDocumentUri, fileState)

	
	// Send the computed diagnostics to VSCode.
	if (settings.sendDiagnostics == "true") {
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: localDiagnostics })
	} else {//settings.sendDiagnostics=="false"
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] })
	};
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event')
})

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: 'TypeScript',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'JavaScript',
				kind: CompletionItemKind.Text,
				data: 2
			}
		]
	}
)
const sleep = (ms: number) => {
	return new Promise(resolve => setTimeout(resolve, ms))
}
connection.onDocumentSymbol(async (_params) => {
	// _params.textDocument.version
	const file = _params.textDocument.uri
	let state
	while (!(state = fileStateMap.get(file))) {
		await sleep(100)
	}
	const Symbols: DocumentSymbol[] = []
	state.graph.definitionsMap.forEach((nodeSet, name) => {
		const range = (nodeSet?.values().next().value as Node).range
		Symbols.push({
			name: name,
			kind: SymbolKind.Function,
			range: range,
			selectionRange: range,
		})
	})
	return Symbols
})

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details'
			item.documentation = 'TypeScript documentation'
		} else if (item.data === 2) {
			item.detail = 'JavaScript details'
			item.documentation = 'JavaScript documentation'
		}
		return item
	}
)


connection.onDefinition(async (_params) => {
	const position = _params.position
	const uri = _params.textDocument.uri
	let ast: AST | undefined
	while (!(ast = fileStateMap.get(uri)?.ast)) {
		await sleep(100)
	}
	const node = ast.search(position)
	const name = node?.name
	const state = fileStateMap.get(uri)
	if (!name)
		return []
	const definitions: LocationLink[] = []
	state?.graph.getDefinations(name).forEach((x) => {
		definitions.push({
			originSelectionRange: node.range,
			targetUri: uri,
			targetRange: x.range,
			targetSelectionRange: x.range
		})
	})
	return definitions
})


connection.onReferences(async (_params) => {
	const position = _params.position
	const uri = _params.textDocument.uri
	let ast: AST | undefined
	while (!(ast = fileStateMap.get(uri)?.ast)) {
		await sleep(100)
	}
	const node = ast.search(position)
	const name = node?.name
	const state = fileStateMap.get(uri)
	if (!name)
		return []
	const references: Location[] = []
	/* search in the same file */
	state?.graph.getReferences(name).forEach((x) => {
		references.push({
			uri: uri,
			range: x.range
		})
	})
	/* search in imported module*/
	for (const _uri of state?.importedFileSet??[]) {
		
		let fileState : FileState|undefined
		let uri = _uri as string
		while (!(fileState = fileStateMap.get(uri))) {
			await sleep(100)
		}
		/* search in the imported file */
		fileState?.graph.getReferences(name).forEach((x) => {
			references.push({
				uri: uri,
				range: x.range
			})
		})   
	}
	return references
})


connection.onHover(async (_params) => {
	const pos = _params.position
	const uri = _params.textDocument.uri
	let ast
	while (!(ast = fileStateMap.get(uri)?.ast)) {
		await sleep(100)
	}
	const node = ast.search(pos)

	return {
		contents: node?.name ?? " ",
		range: node?.range
	}
})


connection.onRequest("textDocument/prepareCallHierarchy", async (_params: { position: Position, textDocument: TextDocumentIdentifier }): Promise<CallHierarchyItem[]> => {
	const pos: Position = _params.position
	const uri = _params.textDocument.uri
	let ast
	while (!(ast = fileStateMap.get(uri)?.ast)) {
		await sleep(100)
	}
	const node = ast.search(pos)
	const name = node?.name
	if (!name)
		return []
	// const items:CallHierarchyItem[] =[];    
	// const state = fileStateMap.get(uri);
	// const callerNameMap =state?.graph.getIncomingCalls(name)
	// if(callerNameMap){
	// 	callerNameMap.forEach((nodeSet,callerName)=>{
	// 		if(!nodeSet)
	// 			return ;
	// 		items.push({
	// 			name:callerName,
	// 			kind:SymbolKind.Function,
	// 			uri:uri,
	// 			range
	// 		})
	// 	})
	// }

	return [{
		name: node.name,
		kind: SymbolKind.Function,
		uri: uri,
		range: node.range,
		selectionRange: node.range,
	}]
})


connection.onRequest("callHierarchy/incomingCalls", (_params: any) => {
	const item = _params.item
	if (!item)
		return []
	const uri = item.uri
	const name = item.name

	const items: CallHierarchyIncomingCall[] = []
	const state = fileStateMap.get(uri)
	const callerNameMap = state?.graph.getIncomingCalls(name)
	if (callerNameMap) {
		callerNameMap.forEach((nodeSet, callerName) => {
			if (!nodeSet)
				return
			const range = state?.graph.getDefinations(callerName).values().next().value.range
			const fromRanges: Range[] = []
			nodeSet.forEach(x => fromRanges.push(x.range))
			items.push({
				from: {
					name: callerName,
					kind: SymbolKind.Function,
					uri,
					range: range,
					selectionRange: range
				},
				fromRanges: fromRanges
			})
		})
	}
	return items
})


connection.onRequest("callHierarchy/outgoingCalls", (_params: any) => {
	const item = _params.item
	if (!item)
		return []
	const uri = item.uri
	const name = item.name

	const items: CallHierarchyOutgoingCall[] = []
	const state = fileStateMap.get(uri)
	const calledNameMap = state?.graph.getOutgoingCalls(name)
	if (calledNameMap) {
		calledNameMap.forEach((nodeSet, calledName) => {
			if (!nodeSet)
				return
			const fromRanges: Range[] = []
			nodeSet.forEach(x => fromRanges.push(x.range))
			const range = fromRanges[0]
			items.push({
				to: {
					name: calledName,
					kind: SymbolKind.Function,
					uri,
					range: range,
					selectionRange: range
				},
				fromRanges: fromRanges
			})
		})
	}
	return items
})
connection.onDidOpenTextDocument(async(_params)=>{
	const textDocumentItem = _params.textDocument
	const version = textDocumentItem.version
	const languageId = textDocumentItem.languageId
	const text = textDocumentItem.text
	const uri = textDocumentItem.uri
	const textDocument=TextDocument.create(uri,languageId,version,text)
	validateTextDocument(textDocument);
});
connection.onDidCloseTextDocument(async (_params)=>{
})
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection)

// Listen on the connection
connection.listen()