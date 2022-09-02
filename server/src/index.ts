import { AnalyseCtx, Atom, compound, CstNode } from './cst2'
import { error } from './pushDiagnostic'
export{index};
function index(node:CstNode,ctx:AnalyseCtx) {
	switch (node.name) {
		case ":-/2":{
			let node2 = node as compound ;
			ruleHead(node2.args[0],ctx);
			ruleBody(node2.args[1],ctx);
			return 
		}

		case "-->/2":{
			let node2 = node as compound;
			DCGHead(node2.args[0],ctx);
			DCGBody(node2.args[1],ctx);
			return ;
		}

		default:
			ctx.graph.addDefinition(node);
			break;
	}
}
function ruleHead(node:CstNode,ctx:AnalyseCtx) {
	/** ban some preds */
	ctx.graph.addDefinition(node);
	ctx.callerNode =node;
	if(node instanceof compound){
		node.args.forEach(x=>arg(x,ctx));
	}
}
function ruleBody(node:CstNode,ctx:AnalyseCtx){
	switch (node.name) {
		case ",/2":
		case ";/2":
		case "|/2":
		case "*->/2":
		case "->/2":{
			let nd = node as compound;
			ruleBody(nd.args[0],ctx);
			ruleBody(nd.args[1],ctx);
			break;
		}
		case "\\+/1":{
			let nd = node as compound;
			ruleBody(nd.args[0],ctx);
			break;
		}
		case ":/2":{
			let nd = node as compound;
			arg(nd.args[0],ctx);
			ruleBody(nd.args[0],ctx);
			break;
		}
		default:{
			ctx.graph.addReference(node);
			if(node instanceof compound){
				node.args.forEach(x=>arg(x,ctx));
			}
			
			break;
		}
	}
}

function DCGHead(node:CstNode,ctx:AnalyseCtx) {
	if(node.name==",/2") {
		let node2 = node as compound;
		DCGHead(node2.args[0],ctx);
		DCGBody(node2.args[1],ctx);
	}
	else if(node instanceof compound){
		node.name = node.value+'/'+(node.args.length+2);
		ctx.graph.addDefinition(node);
		node.args.forEach(x=>arg(x,ctx));
		return;
	}
	else if(node instanceof Atom){
		node.name = node.value + '/'+2;
		ctx.graph.addDefinition(node);
		return;
	}
}

function DCGBody(node:CstNode,ctx:AnalyseCtx){
	switch (node.name) {
		case ",/2":
		case ";/2":
		case "|/2":
		case "->/2":
		case "*->/2":
		case "-->/2":{
			let nd = node as compound;
			DCGBody(nd.args[0],ctx);
			DCGBody(nd.args[1],ctx);
			break;
		}

		case ":/2":{
			let nd = node as compound;

			DCGBody(nd.args[1],ctx);
			break;
		}

		case "[|]/2":{
			let nd = node as compound;
			arg(nd.args[0],ctx);
			arg(nd.args[1],ctx);
			break;
		}

		case "{}/1":
		case "\\+/1":{
			let nd = node as compound;
			arg(nd.args[0],ctx);
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
			if(node instanceof Atom){
				node.name = node.value+"/"+2;
			}
			else if(node instanceof compound){
				node.name = node.value+"/"+(node.args.length+2);
			}
			ctx.graph.addReference(node);
	}
	
}

function arg(node:CstNode,ctx:AnalyseCtx) {
	ctx.graph.addReference(node);
}
