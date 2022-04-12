import { DocumentUri } from 'vscode-languageserver'
import { Graph } from './graph'
import { OpTable } from './op_table'
export {FileState}
class FileState {
	uri:DocumentUri
	graph:Graph
	opTable:OpTable
	constructor(uri: string ) {
		this.graph = new Graph();
		this.opTable = new OpTable();	
		this.uri = uri
	}
}