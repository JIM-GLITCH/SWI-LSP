import path = require('path')
import { DocumentUri } from 'vscode-languageserver'
import  child_process =require("child_process");
import { Graph } from './graph'
import { optable } from './operators'
import { fileCst } from './cst2'
export{g};
/**
 * use this file  to define  "global variables"
 */

interface DocumentObj{
	fileCst:fileCst
	graph:Graph
	optable:optable
}

let g={
	x:"123",
	DocumentManager: new Map<DocumentUri,DocumentObj>(),
	PrologLibPath : (() => {
		if (process.platform === "win32") {
			let swiplPath = child_process.execSync("where.exe swipl").toString()
			const swiplHomePath = swiplPath.split("\\").slice(0, -2)
			return path.join(...swiplHomePath, "library")
		}
	})()

}