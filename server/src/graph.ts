import { Node } from './astNode'
export{Graph}
/**One document corresponds to one graph */
type name = string  
class Graph{
	/** */
	nodesSet: Set<any>
	referencesMap: Map<name, Set<Node>|undefined>
	definitionsMap: Map<name, Set<Node>|undefined>
	/** ` called name -> caller name -> callednodes`*/
	incomingCallsMap:Map<name,Map<name,Set<Node>|undefined>|undefined>
	/** ` caller name -> called name -> callednodes` */
	outgoingCallsMap:Map<name,Map<name,Set<Node>|undefined>|undefined>
	constructor(){    
		this.nodesSet = new Set();
		this.referencesMap = new Map();
		this.definitionsMap = new Map();
		this.incomingCallsMap= new Map();
		this.outgoingCallsMap = new Map();		
	}
	getDefinations(name:string){
		return this.definitionsMap.get(name)??[]
	}

	getReferences(name:string){
		return this.referencesMap.get(name)??[]
	}

	getIncomingCalls(calledName:string){
		return this.incomingCallsMap.get(calledName)
	}

	getOutgoingCalls(callerName:string){
		return this.outgoingCallsMap.get(callerName)
	}

	addDefinition(name:string,node:Node){
		const set = this.definitionsMap.get(name);
		set
		?	set.add(node)
		:	this.definitionsMap.set(name,new Set([node]));
		this.addReference(name,node)
	}

	addReference(name:string,node:Node){
		const set = this.referencesMap.get(name);
		set
		?	set.add(node)
		:	this.referencesMap.set(name,new Set([node]));
	}

	addIncomingCall(calledName:string,callerName:string,calledNode:Node){
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

	addOutgoingCall(callerName:string,calledName:string,calledNode:Node){
		let calledNameMap = this.outgoingCallsMap.get(callerName)
		if(calledNameMap===undefined){
			return this.outgoingCallsMap.set(callerName,new Map([[calledName,new Set([calledNode])]] ))
		}
		let calledNodeSet = calledNameMap.get(calledName)
		if(calledNodeSet===undefined){
			return calledNameMap.set( calledName,new Set([calledNode]))
		}
		return calledNodeSet.add(calledNode)
	}
	addCall(calledName:string|undefined,callerName:string|undefined,calledNode:Node){
		if (calledName ===undefined || callerName ===undefined)
			return;
		this.addIncomingCall(calledName,callerName,calledNode)
		return this.addOutgoingCall(callerName,calledName,calledNode)
	}
	delDefination(name:string,node:Node){
		const set = this.definitionsMap.get(name);
		set?.delete(node);
		if(set?.size == 0)
			this.definitionsMap.delete(name);
		this.delReference(name,node)
	
	}

	delReference(name:string,node:Node){
		const set = this.referencesMap.get(name);
		set?.delete(node);
		if(set?.size == 0)
			this.referencesMap.delete(name);
	}
}