import { Atom, Compound, CstNode,  List } from './cst2'
export{isAtom,
	isList,
	isInteger
}
function isAtom(node:CstNode): node is Atom {
	return !(node as Compound).args && (node.token.type =="atom");
}

function isList(x:any): x is List {
	return  "refreshEndToken" in x;
}
function isInteger(x:CstNode) {
	return x.token.type =="integer";
}