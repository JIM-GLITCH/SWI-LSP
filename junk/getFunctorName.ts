import { AtomNode, FunctorNode } from '../server/src/astNode';
import { token } from '../server/src/lexer';
export{getFunctorName};
function getFunctorName(a:{kind:Kind}){
	switch (a.kind) {
		case Kind.AtomNode:
			return (a as AtomNode).functor.text;
		case Kind.FunctorNode:
			return (a as FunctorNode).functor.text;
		
		default:
			return " ";
	} 
}