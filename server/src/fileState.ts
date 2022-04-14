import { DocumentUri, Location, Position, Range } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { Graph } from './graph'
import { OpTable } from './op_table'
export {FileState}
class FileState {
	uri:DocumentUri
	graph:Graph
	opTable:OpTable
	textDocument:TextDocument
	constructor(textDocument:TextDocument ) {
		this.graph = new Graph();
		this.opTable = new OpTable();	
		this.uri = textDocument.uri;
		this.textDocument=textDocument;
	}
}