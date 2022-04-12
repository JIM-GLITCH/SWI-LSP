class a {
	graph;
	me
	constructor(graph){
		this.graph = graph;
	}
	
	b = class{
		graph
		constructor(graph){
		this.graph = graph
		}
		getGraph(){
			return this.graph;
		}
	}
	newClassB(){
		return new this.b(this.graph)
	}
}
