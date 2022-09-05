import { AnalyseCtx, Atom, Compound, CstNode,  List } from './cst2'
import { error } from './pushDiagnostic'
export{isAtom,
	isList,
	isInteger,
	check
}
function isAtom(node:CstNode): node is Atom {
	return !(node as Compound).args && (node.token.type =="atom");
}
isAtom.message="atom";



function isList(x:any): x is List {
	return  "refreshEndToken" in x;
}
isList.message="list";

function check<T>(node:any,checker:((x:any)=>x is T),ctx:AnalyseCtx):node is T{
	if(!checker(node)){
		error((node as CstNode).getRange(),`expected ${(checker as any).message}`,ctx);
		return false;
	}
	return true;
}

function isInteger(x:CstNode) {
	return x.token.type =="integer";
}