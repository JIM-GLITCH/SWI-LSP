
import { CstNode } from "./cst2"
export{Graph}
/**One document corresponds to one graph */
type name = string  
class Graph{
	/** */
	nodesSet: Set<any>
	referencesMap: Map<name, Set<CstNode>|undefined>
	definitionsMap: Map<name, Set<CstNode>|undefined>
	/** ` called name -> caller name -> callednodes`*/
	incomingCallsMap:Map<name,Map<name,Set<CstNode>|undefined>|undefined>
	/** ` caller name -> called name -> callednodes` */
	outgoingCallsMap:Map<name,Map<name,Set<CstNode>|undefined>|undefined>
	constructor(){    
		this.nodesSet = new Set();
		this.referencesMap = new Map();
		this.definitionsMap = new Map();
		this.incomingCallsMap= new Map();
		this.outgoingCallsMap = new Map();		
	}
	getDefinations(node:CstNode|undefined){
		if(!node){
			return[];
		}
		return this.definitionsMap.get(node.name)??[]
	}

	getReferences(node:CstNode){
		return this.referencesMap.get(node.name)??[]
	}

	getIncomingCalls(calledNode:CstNode){
		return this.incomingCallsMap.get(calledNode.name)
	}

	getOutgoingCalls(callerNode:CstNode){
		return this.outgoingCallsMap.get(callerNode.name)
	}

	addDefinition(node:CstNode){
		let  name = node.name
		const set = this.definitionsMap.get(name);
		set
		?	set.add(node)
		:	this.definitionsMap.set(name,new Set([node]));
		this.addReference(node)
	}

	addReference(node:CstNode){
		let name = node.name
		const set = this.referencesMap.get(name);
		set
		?	set.add(node)
		:	this.referencesMap.set(name,new Set([node]));
	}

	addIncomingCall(calledNode:CstNode,callerNode:CstNode){
		let callerName = callerNode.name;
		let calledName:string = calledNode.name;
		let callerMap = this.incomingCallsMap.get(calledName)
		if(callerMap===undefined){
			this.incomingCallsMap.set(calledName,new Map( [[callerName,new Set([calledNode])]] ))
			return 
		}
		let calledNodeSet = callerMap.get(callerName)
		if(calledNodeSet===undefined){
			return callerMap.set(callerName,new Set([calledNode]))
		}
		return calledNodeSet.add(calledNode)
	}

	addOutgoingCall(callerNode:CstNode,calledNode:CstNode){
		let callerName = callerNode.name;
		let calledName = calledNode.name;
		let calledNameMap = this.outgoingCallsMap.get(callerName)
		if(calledNameMap===undefined){
			return this.outgoingCallsMap.set(callerNode.name,new Map([[calledNode.name,new Set([calledNode])]] ))
		}
		let calledNodeSet = calledNameMap.get(calledName)
		if(calledNodeSet===undefined){
			return calledNameMap.set( calledName,new Set([calledNode]))
		}
		return calledNodeSet.add(calledNode)
	}
	addCall(calledNode:CstNode,callerNode:CstNode){
		this.addIncomingCall(calledNode,callerNode)
		return this.addOutgoingCall(callerNode,calledNode)
	}
	delDefination(name:string,node:CstNode){
		const set = this.definitionsMap.get(name);
		set?.delete(node);
		if(set?.size == 0)
			this.definitionsMap.delete(name);
		this.delReference(name,node)
	
	}

	delReference(name:string,node:CstNode){
		const set = this.referencesMap.get(name);
		set?.delete(node);
		if(set?.size == 0)
			this.referencesMap.delete(name);
	}
}