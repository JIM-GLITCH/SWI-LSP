import { AnalyseCtx, Atom, Compound, CstNode } from './cst2'
import { error } from './pushDiagnostic';
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
			indexArgs(node2.args[0],ctx);
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
			indexArgs(n.args[0],ctx);
			ruleHead(n.args[1],ctx);
			return ;
		}

		default:
			break;
	}
	addDefinition(node,ctx);
	ctx.callerNode =node;
	indexArgs(node,ctx);
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
			indexArgs(nd.args[0],ctx);
			ruleBody(nd.args[0],ctx);
			break;
		}
		default:{
			addReference(node,ctx);
			indexArgs(node,ctx);
			
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
			indexArgs(node2.args[0],ctx);
			DCGHead(node2.args[1],ctx);
			return;
		}

		default:
			break;
	}
	dcg_extend(node);
	ctx.callerNode =node;
	addDefinition(node,ctx);
	indexArgs(node,ctx);
}

function dcg_extend(node:CstNode) {
	if(isCompound(node)){
		node.name = node.value+'/'+(node.args.length+2)
	}
	else if(isAtom(node)){
		node.name = node.value+'/2';
	}
}

function indexArgs(node:CstNode,ctx:AnalyseCtx) {
	addReference(node,ctx);
	if(isCompound(node)){
		node.args.forEach(x=>indexArgs(x,ctx));
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
			indexArgs(nd.args[0],ctx);
			DCGBody(nd.args[1],ctx);
			break;
		}

		case "[|]/2":{
			let nd = node as Compound;
			indexArgs(nd.args[0],ctx);
			indexArgs(nd.args[1],ctx);
			break;
		}

		case "{}/1":
		case "\\+/1":{
			let nd = node as Compound;
			indexArgs(nd.args[0],ctx);
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
			indexArgs(node,ctx);
			ctx.optable.op(args[0],args[1],args[2],ctx);
			return
		}	
		
		case "use_module/1":{
			
		}
		default:{
			addReference(node,ctx);
			indexArgs(node,ctx);
		}

	}
}

