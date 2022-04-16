import { Node } from './astNode'
export{Graph}
/**One document corresponds to one graph */  
class Graph{
	/** */
	nodes:any;
	definition:any;
	reference:any;
	nodesSet: Set<any>
	referencesMap: Map<string, Set<Node>|undefined>
	definitionsMap: Map<string, Set<Node>|undefined>
	constructor(){
		this.nodesSet = new Set();
		this.referencesMap = new Map();
		this.definitionsMap = new Map();		
	}
	getDefinations(name:string){
		return this.definitionsMap.get(name)??[]
	}
	getReferences(name:string){
		return this.referencesMap.get(name)??[]
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