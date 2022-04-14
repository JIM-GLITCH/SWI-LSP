import { Position } from 'vscode-languageserver'
import { ClauseNode } from './astNode'
export{AST}
class AST{
	clauses:ClauseNode[];
	constructor(clauses:ClauseNode[]){
		this.clauses = clauses;
	}
	/**binary search a node */
	search(pos:Position){ 
		let low = 0, high =this.clauses.length;
		const line = pos.line;
		while (low < high){
			const mid = Math.floor((low + high)/2)
			const clauseNode = this.clauses[mid];
			if (clauseNode.range.start.line>line){
				high = mid;
			}
			else if(clauseNode.range.end.line<line){
				low = mid + 1;
			}
			else{
				return clauseNode.search(pos);
			}
		}
	}
}