import { AnalyseCtx, Atom, Compound, CstNode,List } from './cst2'
import { g } from './globalVars'
import { error } from './pushDiagnostic';
import fs =require("fs");
import path = require('path')
import {URI} from "vscode-uri"
import { MyParser } from './parser-on-moo'
import { check,  isList } from './utils'
export{index};

function index(node:CstNode,ctx:AnalyseCtx) {
	switch (node.name) {
		case ":-/1":{
			// TODO:
			return ruleEval((node as Compound).args[0],ctx);
		}
		case ":-/2":{
			let node2 = node as Compound ;
			ruleHead(node2.args[0],ctx);
			ruleBody(node2.args[1],ctx);
			return 
		}

		case "-->/2":{
			let node2 = node as Compound;
			DCGHead(node2.args[0],ctx);
			DCGBody(node2.args[1],ctx);
			return ;
		}
		
		case ":/2":{
			let node2 = node as Compound;
			addRefAndIndexArg(node2.args[0],ctx);
			DCGBody(node2.args[1],ctx);
			return ;
		}
		default:
			addDefinition(node,ctx);
			ctx.callerNode = node;
			break;
	}
}
function ruleHead(node:CstNode,ctx:AnalyseCtx) {
	/** ban some preds */
	switch (node.name) {
		case ":/2":{
			let n = node as Compound;
			addRefAndIndexArg(n.args[0],ctx);
			ruleHead(n.args[1],ctx);
			return ;
		}

		default:
			break;
	}
	addDefinition(node,ctx);
	ctx.callerNode =node;
	addRefAndIndexArg(node,ctx);
}    
function ruleBody(node:CstNode,ctx:AnalyseCtx){
	switch (node.name) {
		case ",/2":
		case ";/2":
		case "|/2":
		case "*->/2":
		case "->/2":{
			let nd = node as Compound;
			ruleBody(nd.args[0],ctx);
			ruleBody(nd.args[1],ctx);
			break;
		}
		case "\\+/1":{
			let nd = node as Compound;
			ruleBody(nd.args[0],ctx);
			break;
		}
		case ":/2":{
			let nd = node as Compound;
			addRefAndIndexArg(nd.args[0],ctx);
			ruleBody(nd.args[0],ctx);
			break;
		}
		default:{
			addReference(node,ctx);
			addRefAndIndexArg(node,ctx);
			
			break;
		}
	}
}

function DCGHead(node:CstNode,ctx:AnalyseCtx) {
	switch (node.name) {
		case ",/2":{
			let node2 = node as Compound;
			DCGHead(node2.args[0],ctx);
			DCGBody(node2.args[1],ctx);
			return ;
		}
		case ":/2":{
			let node2 = node as Compound;
			addRefAndIndexArg(node2.args[0],ctx);
			DCGHead(node2.args[1],ctx);
			return;
		}

		default:
			break;
	}
	dcg_extend(node);
	ctx.callerNode =node;
	addDefinition(node,ctx);
	addRefAndIndexArg(node,ctx);
}

function dcg_extend(node:CstNode) {
	if(isCompound(node)){
		node.name = node.value+'/'+(node.args.length+2)
	}
	else if(isAtom(node)){
		node.name = node.value+'/2';
	}
}

function addRefAndIndexArg(node:CstNode,ctx:AnalyseCtx) {
	addReference(node,ctx);
	if(isCompound(node)){
		node.args.forEach(x=>addRefAndIndexArg(x,ctx));
	}
}
function isCompound(node:CstNode): node is Compound {
	return "args" in node;
}

function isAtom(node:CstNode): node is Atom{
	return !("args" in node) && node.token.type =="atom";
}
function DCGBody(node:CstNode,ctx:AnalyseCtx){
	switch (node.name) {
		case ",/2":
		case ";/2":
		case "|/2":
		case "->/2":
		case "*->/2":
		case "-->/2":{
			let nd = node as Compound;
			DCGBody(nd.args[0],ctx);
			DCGBody(nd.args[1],ctx);
			break;
		}

		case ":/2":{
			let nd = node as Compound;
			addRefAndIndexArg(nd.args[0],ctx);
			DCGBody(nd.args[1],ctx);
			break;
		}

		case "[|]/2":{
			let nd = node as Compound;
			addRefAndIndexArg(nd.args[0],ctx);
			addRefAndIndexArg(nd.args[1],ctx);
			break;
		}

		case "{}/1":
		case "\\+/1":{
			let nd = node as Compound;
			addRefAndIndexArg(nd.args[0],ctx);
			break;
		}
	
		case "!":
		case "[]":{
			break;
		}

		case "{}":{
			node.name = "true";
			break;
		}

		default:
			dcg_extend(node);
			addReference(node,ctx);
	}
	
}


function addReference(node:CstNode,ctx:AnalyseCtx) {
	ctx.graph.addReference(node,ctx);
}

function addDefinition(node:CstNode,ctx:AnalyseCtx) {
	ctx.graph.addDefinition(node,ctx);
}

function ruleEval(node:CstNode,ctx:AnalyseCtx) {
	switch(node.name){
		case ",/2":{
			let args =  (node as Compound).args;
			ruleEval(args[0],ctx);
			ruleEval(args[1],ctx);
			return
		}
		case "op/3":{
			let args =  (node as Compound).args;
			addRefAndIndexArg(node,ctx);
			ctx.optable.op(args[0],args[1],args[2],ctx);
			return
		}	
		
		case "use_module/1":{
			addReference(node,ctx);
			let nd = node as Compound;
			return use_module_1(nd.args[0],ctx);
		}
		case "module/2":{
			let nd = node as Compound;
			module_2(nd.args[0],nd.args[1],ctx);
		}
		default:{
			addRefAndIndexArg(node,ctx);
		}

	}
}

function use_module_1(node:CstNode,ctx:AnalyseCtx) {
	switch (node.name){
		case "library/1":{
			addReference(node,ctx)
			let nd = node as Compound;
			return library(nd.args[0]);
		}

		default:{
			let filename:string = node.value+".pl";
			let uri = URI.parse(ctx.uri);
			let dirpath =path.dirname(uri.fsPath);
			let targetPath = path.join(dirpath,filename)
			let targetURI = URI.file(targetPath);
			let content="";
			let targetURIStr = targetURI.toString();
			if (g.DocumentManager.has(targetURIStr)){
				let docObj = g.DocumentManager.get(targetURIStr);
				if(!docObj){
					return;
				}
				ctx.optable.absorb(docObj.optable,ctx);
				return;
			}
			try{
				g.DocumentManager.set(targetURIStr,undefined);
				content = fs.readFileSync(targetPath).toString();
			}catch{
				error(node.getRange(),"can't read this file",ctx);
				return
			}
			let parser = new MyParser(targetURIStr);
			parser.reset(content);
			let documentObj = parser.parse();
			g.DocumentManager.set(targetURIStr,documentObj);
			ctx.optable.absorb(documentObj.optable,ctx);
			
		}
			// g.DocumentManager.get()
	}
}

function library(node:CstNode) {
	
}

function module_2(moduleName:CstNode,List:CstNode,ctx:AnalyseCtx) {
	if(check(moduleName,isAtom,ctx)&&check(List,isList,ctx)){
		return publicList(List,ctx);
	}
}

function publicList(node: List|CstNode,ctx:AnalyseCtx):void {
	if(node.name == "[|]/2"){
		let list = node as List;
		let head = list.args[0];
		if(head.name == "op/3"){
			addRefAndIndexArg(head,ctx);
			let args = (head as Compound).args;
			ctx.optable.op(args[0],args[1],args[2],ctx);
			return publicList(list.args[1],ctx);
		}
	}
	else{
		return addRefAndIndexArg(node,ctx);
	}
	
}
