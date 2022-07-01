import path = require('path')
import fs = require("fs")
import { URI } from "vscode-uri"
import { DocumentUri, Location, Position, Range } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { AtomNode, FunctorNode, InfixOpArgNode, Node, PrefixOpArgNode, Semantic } from './astNode'
import { Graph } from './graph'
import { OpTable } from './op_table'
import { PrologLibPath, validateTextDocument} from"./server"
import { InputStream, read_tokens } from './lexer'
import {Parser}from "./parser"
import { pushError } from './pushDiagnostic'
import {G} from "./globalVars"
import { AST } from './AST'
// import { URI } from 'vscode-uri'
export {FileState}

const g = G.getInstance()
const fileStateMap = g.fileStateMap;
class FileState {
	importedFileSet:Set<String>
	uri:DocumentUri
	graph:Graph
	opTable:OpTable
	textDocument:TextDocument
	ast!:AST
	version!:number
	constructor(textDocument:TextDocument ) {
		this.graph = new Graph();
		this.opTable = new OpTable();	
		this.uri = textDocument.uri;
		this.textDocument=textDocument;
		this.importedFileSet=new Set()
		// this.version=1
	}
	/** `:-node . `*/
	tryImport(node:Node){
		if (node.functor?.text == "use_module" 
		&& node.kind == K.FunctorNode )
		{
			if (node.arity!<1||node.arity!>3)
				return ;
			const mNode = (node as FunctorNode).getArgs()[0]
			/* library(xxx) */
			
			if (mNode.functor?.text=="library"&&mNode.arity==1){
				const fileNode = (mNode as FunctorNode).getArgs()[0]
				/* find path  and add it to set */
				const filePath = this.findLibraryFilePath(fileNode)+".pl"
				const fileUri = URI.file(filePath).toString()
				this.importedFileSet.add(fileUri);
				/* modify op_table */
				let fileText:string
				try{
					fileText = fs.readFileSync(filePath).toString()
				}
				catch{
					pushError(mNode.range,"can't find module")
					return 
				}

				/*modify op table */
				let fileState:FileState|undefined; 
					/* 分析过直接 把op 复制过来 */
				if ((fileState = fileStateMap.get(fileUri))!==undefined){
					this.opTable.merge(fileState.opTable)
				}else{
					/*没分析过 找到 module声明 把op复制过来后 再分析  */
					const fileStream = InputStream(fileText!)
					for (let index = 0; index < 2; index++) {
						const tokens = read_tokens(fileStream)
						if (tokens === undefined)
							return;
						const Answer = (new Parser()).readClause(tokens)
						if (Answer === undefined)
							return;
						if((Answer.term as PrefixOpArgNode)?.arg?.functor.text!="module")
							continue;
						Answer.walk(Semantic.TopLevel,this,{});
					}
					/* parse imported file */
					const t  = TextDocument.create(fileUri,"prolog",1,fileText);
					validateTextDocument(t)	
				}
				
			}
		}
	}
	findLibraryFilePath(fileNode:Node){
		const names = []
		let p = fileNode
		for(;;){
			if (p.kind==K.AtomNode){
				names.push((p as AtomNode).functor.text)
				break;
			}
			if(p.kind==K.InfixOpArgNode && p.functor?.text=="/"){
				names.push((p as InfixOpArgNode).right.functor.text)
				p=(p as InfixOpArgNode).left;
				continue;
			}
		}

		return path.join(PrologLibPath!,...names.reverse())
		
	}
}