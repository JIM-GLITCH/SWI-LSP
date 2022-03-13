import { AtomNode, FunctorNode } from './astNode';
import { token } from './lexer';
export{getFunctorName};
function getFunctorName(a:{kind:Kind}){
	switch (a.kind) {
		case Kind.AtomNode:
			return (a as AtomNode).functor.functor;
		case Kind.FunctorNode:
			return (a as FunctorNode).functor.functor;
		
		default:
			return " ";
	} 
}