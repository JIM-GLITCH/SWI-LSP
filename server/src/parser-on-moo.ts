
import { mylexer, tokenList } from './lexer-by-moo'
import { LexerState, Token } from 'moo'
import {
	Compound, prefix_compound, infix_compound, postfix_compound, Negetive, clause, CstNode, Atomic, fileCst, List, tokenRange, dict
	, AnalyseCtx
} from './cst2'
import { optable } from "./operators"
import { Flag as F } from './context_flags'
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver'
import { Graph } from './graph'
import { error, warning } from "./pushDiagnostic"
export { Parser as MyParser }
interface infixop {
	lPrec: number
	opPrec: number
	rPrec: number
	type: "infix"
}
interface postfixop {
	lPrec: number
	opPrec: number
	type: "postfix"
}
interface AnsS {
	Answer: any
	S: TokenIter
}
/**
 * 	TODO: because non-deterministic, need to keep the errors temporarily 
 * 	before parsing a clause is done.
 * 
 * 	after done, if success then drop all the errors,	
				else push all the errors.
 * 	
 */
class Parser{
	lexer
	optable
	uri: string
	diagnostics: Diagnostic[] = [];
	constructor(uri: string) {
		this.lexer = mylexer.clone()
		this.optable = new optable()
		this.uri = uri
	}

	reset(text: string, info?: LexerState) {
		return this.lexer.reset(text, info)
	}
	parse() {
		// let clauses :clause[]  =[...this].filter((X):X is clause =>!!X);
		let clauses = []
		let graph = new Graph()
		for (let clause of this) {
			if (!!clause) {
				let ctx: AnalyseCtx = {
					graph: graph,
					optable: this.optable,
					diagnostics: this.diagnostics,
					clause: clause,
					uri: this.uri,
				}
				clause.analyse(ctx)
				clause.callerNode = ctx.callerNode
				clauses.push(clause)
			}
		}
		return { fileCst: new fileCst(...clauses), graph, optable: this.optable }

	}

	next(): clause | undefined {
		let tokenList = this.lexer.getTokens()
		for (const token of tokenList.errors) {
			error(tokenRange(token),"invlid token",this);
		}
		if (tokenList.tokens.length == 0) {
			return undefined
		}
		let S = new TokenIter(tokenList.tokens)
		let r: AnsS = { S: S, Answer: new Atomic(S.val()!) }
		let tk = r.S.val() as Token
		for (r of this.read(S, 1200, 0)) {
			let tk2 = r.S.val()
			if (this.all_read(tk2)) {
				return new clause(r.Answer, tokenList)
			}
			tk = tk2
		}
		// this.errors.push(creat_error(tokenRange(tk),`operator expected after expression ${tk.text}`));
		// syntax_error([operator,expected,after,expression], S).
		return new clause(r?.Answer, tokenList)
	}
	all_read(tk: Token | undefined): tk is undefined {
		if (tk == undefined) {
			return true
		}
		else {

			return false
		}
	}
	expect(tokenString: string, S: TokenIter) {
		let Rest = S.next()
		let token = S.val()
		if (token?.text == tokenString) {
			return Rest
		}
		let tk = S.tokens[S.idx - 1]
		error(tokenRange(tk), `${tokenString} expected after expression `, this)
		// syntax_error([Token,or,operator,expected], S0).
		return
	}
	*read(S1: TokenIter, Prec: number, ctx: number): Generator<{ Answer: CstNode, S: TokenIter }> {
		let S2 = S1.next()
		let S3 = S2.next()
		let token1 = S1.val()
		let token2 = S2.val()
		if (!token1) {
			return undefined
		}
		let type = token1.type
		/** ctx process  */
		if ((type == "var"
			|| type == "atom"
			|| type == "integer"
			|| type == "string")
			&& (token2?.text == "," && ctx & F.COMMA_TERMINATES
				|| token2?.text == "|" && ctx & F.BAR_TERMINATES
				|| token2?.text == ":" && ctx & F.COLON_TERMINATES)
		) {
			yield { S: S2, Answer: new Atomic(token1) }
			return
		}


		switch (token1.type) {
			case "var":
				// if(token2?.type=="open"){

				// 	for(let  r of this.read(S3,999,ctx)){
				// 		if(!r){
				// 			return undefined;
				// 		}
				// 		let r2 = this.read_args(r.S,[token1,r.Answer],ctx);
				// 		if(!r2){
				// 			return undefined;
				// 		}
				// 		yield* this.exprtl0(r2.S,new infix_compound(token2,r2.args,"apply"),Prec,ctx);
				// 	}
				// 	return
				// }
				if (token2?.text == "{") {
					let nodes: CstNode[] = [new Atomic(token1)]
					let S = this.read_dict(S3, Prec, ctx, nodes)
					if (!S) {
						return
					}
					yield* this.exprtl0(S, new dict(token2, nodes), Prec, ctx)
				}
				else if (token2?.value == "{}") {
					yield* this.exprtl0(S3, new dict(token2, [new Atomic(token1)]), Prec, ctx)
				}
				yield* this.exprtl0(S2, new Atomic(token1), Prec, ctx)
				return
			case "atom":



				if (token1?.text == "-" && token2?.type == "integer") {
					yield* this.exprtl0(S3, new Negetive(token1, token2), Prec, ctx)
					return
				}
				else if (token2?.type == "open_ct") {
					for (let r of this.read(S3, 1200, 0 | F.COMMA_TERMINATES)) {
						if (!r) {
							return undefined
						}
						let r2 = this.read_args(r.S, [r.Answer], ctx)
						if (!r2) {
							return undefined
						}
						let Term = new Compound(token1, r2.args)
						yield* this.exprtl0(r2.S, Term, Prec, ctx)

					}
					return
				}
				/** read dcit */
				else if (token2?.value == "{}") {
					yield* this.exprtl0(S3, new dict(token2, [new Atomic(token1)]), Prec, ctx)
				}
				else if (token2?.text == "{") {
					let nodes: CstNode[] = [new Atomic(token1)]
					let S = this.read_dict(S3, Prec, ctx, nodes)
					if (!S) {
						return
					}
					yield* this.exprtl0(S, new dict(token2, nodes), Prec, ctx)
				}
				let op = this.prefixop(token1.text)
				if (op) {
					yield* this.after_prefix_op(token1, op.opPrec, op.rPrec, S2, Prec, ctx)
				}
				yield* this.exprtl0(S2, new Atomic(token1), Prec, ctx)
				return
			case "integer":
				yield* this.exprtl0(S2, new Atomic(token1), Prec, ctx)
				return
			case "open_list":
				/** processed in lexer */
				// if(token2?.type=="close_list")
				{
					for (let r of this.read(S2, 999, 0 | F.BAR_TERMINATES | F.COMMA_TERMINATES)) {
						if (!r) {
							return undefined
						}
						let node = new List(token1, [r.Answer], '[|]')
						let r2 = this.read_list(r.S, node, 0)

						if (!r2) {
							return undefined
						}
						node.refreshEndToken(r2.endToken)
						yield* this.exprtl0(r2.S, node, Prec, ctx)
					};

					return
				}
			case "open":
				{
					for (let r of this.read(S2, 1200, 0)) {
						if (!r) {
							return undefined
						}
						let S3 = this.expect(")", r.S)
						if (!S3) {
							return undefined
						}
						yield* this.exprtl0(S3, r.Answer, Prec, ctx)
					}
					return
				}
			case "open_ct":
				{
					for (let r of this.read(S2, 1200, 0)) {
						if (!r) {
							return undefined
						}
						let S3 = this.expect(")", r.S)
						if (!S3) {
							return undefined
						}
						yield* this.exprtl0(S3, r.Answer, Prec, ctx)
					};

					return
				}
			case "open_curly":
				/**processed in lexer 
				 * if(token2.text == "}");
				*/
				{
					for (let r of this.read(S2, 1200, 0)) {
						if (!r) {
							return undefined
						}
						let S3 = this.expect("}", r.S)
						if (!S3) {
							return undefined
						}
						token1.value = "{}"
						yield* this.exprtl0(S3, new Compound(token1, [r.Answer]), Prec, ctx)
						token1.value = token1.text
					}
					return
				}
			case "string":
				yield* this.exprtl0(S2, new Atomic(token1), Prec, ctx)
				return
			default:
				error(tokenRange(token1), `${token1.text} cannot start an expression`, this)
			// syntax_error([Token,cannot,start,an,expression],
		}
	}
	read_dict(S3: TokenIter, Prec: number, ctx: number, nodes: CstNode[]) {

		// if(token3?.text =="}")
		let S4 = this.read_KV(S3, ctx, nodes)
		if (!S4) {
			return
		}
		let S5 = this.read_KVs(S4, ctx, nodes)
		if (!S5) {
			return
		}
		return S5


	}
	read_KVs(S1: TokenIter, ctx: number, nodes: CstNode[]): TokenIter | undefined {
		let token1 = S1.val()
		let S2 = S1.next()
		if (!token1) {
			return
		}
		if (token1.text == ",") {
			let S3 = this.read_KV(S2, ctx, nodes)
			if (!S3) {
				return
			}
			return this.read_KVs(S3, ctx, nodes)
		}
		if (token1.text == "}") {
			return S2
		}
		error(tokenRange(token1), '`,` or `}` expected in arguments', this)
		return
	}
	read_KV(S3: TokenIter, ctx: number, nodes: CstNode[]) {
		/**read key */
		let r = <AnsS | undefined>this.read(S3, 1200, ctx | F.COLON_TERMINATES | F.COMMA_TERMINATES).next().value
		if (!r) {
			return
		}
		nodes.push(r.Answer)
		/**expect : */
		let S = this.expect(":", r.S)
		if (!S) {
			return
		}
		/**read value */
		let r3 = this.read(S, 1200, ctx | F.COMMA_TERMINATES).next().value
		if (!r3) {
			return
		}
		nodes.push(r3.Answer)
		return r3.S

	}
	read_args(S1: TokenIter, args: any[], ctx: number): { S: TokenIter, args: CstNode[], close: Token } | undefined {
		let S2 = S1.next()
		let token1 = S1.val();;
		let read_args_ctx = 0 | F.COMMA_TERMINATES
		if (token1?.text == ",") {
			let r = this.read(S2, 1200, read_args_ctx).next().value
			if (!r) {
				return undefined
			}
			args.push(r.Answer)
			return this.read_args(r.S, args, read_args_ctx)
		}
		if (token1?.text == ")") {
			return { S: S2, args: args, close: token1 }
		}
		let tk = token1 ?? S1.tokens[S1.idx - 1]
		error(tokenRange(tk), `', or )' expected in arguments`, this)
		// syntax_error([', or )',expected,in,arguments], S).

	}

	read_list(S1: TokenIter, node: Compound, ctx: number): { S: TokenIter, endToken: Token } | undefined {
		let S2 = S1.next()
		let token1 = S1.val()
		// if(!token1){
		// 	return undefined;
		// }
		//error-recovery
		let read_list_ctx = ctx | F.BAR_TERMINATES | F.COMMA_TERMINATES
		switch (token1?.text) {

			case ",":
				{
					let r = this.read(S2, 999, read_list_ctx).next().value
					if (!r) {
						return undefined
					}
					let node2 = new List(token1, [r.Answer], "[|]")
					node.args.push(node2)
					return this.read_list(r.S, node2, ctx)

				}
			case "|":
				{
					let r = this.read(S2, 999, read_list_ctx).next().value
					if (!r) {
						return undefined
					}
					node.args.push(r.Answer)
					let S3 = this.expect("]", r.S)
					if (!S3) {
						return undefined
					}
					return { S: S3, endToken: r.S.val() }
				}
			case "]":
				{
					node.args.push(new Atomic(token1, "[]"))
					return { S: S2, endToken: token1 }
				}

			default:
				let tk = token1 ?? S1.tokens[S1.idx - 1]
				error(tokenRange(tk), `['  | or ]' expected in list]`, this)
				//syntax_error([', | or ]',expected,in,list], S).
				break
		}
	}
	*after_prefix_op(Op: Token, Oprec: number, _Aprec: number, S1: TokenIter, Prec: number, ctx: number) {
		let S2 = S1.next()
		let token1 = S1.val()
		let token2 = S2.val()
		// let NewS: TokenIter


		{
			if (Prec < Oprec) {
				let tk = S1.tokens[S1.idx - 1]
				warning(tokenRange(tk), `prefix operator ${Op.text} in context with precedence ${Prec}`, this)
				// syntax_error([prefix,operator,Op,in,context,
				// 	with,precedence,Precedence], S0).
				//error_recory??
				return
			}
		}

		{
			for (let _ of this.peepop(token1, token2)) {
				if ( this.prefix_is_atom(token1, Oprec)) {
					yield* this.exprtl(S1, Oprec, new Atomic(Op), Prec, ctx)
				}
			}
		}

		// {
		// 	let r = this.read(S1, _Aprec, ctx).next().value
		// 	if (!r) {
		// 		return undefined
		// 	}
		// 	let Term = new prefix_compound(Op, [r.Answer])
		// 	yield* this.exprtl(r.S, Oprec, Term, Prec, ctx)
		// }
		for (const r of this.read(S1, _Aprec, ctx)) {
			if (!r) {
				return undefined
			}
			let Term = new prefix_compound(Op, [r.Answer])
			yield* this.exprtl(r.S, Oprec, Term, Prec, ctx)
		}
	}
	*peepop(token1: Token | undefined, token2: Token | undefined) {
		if (token1?.type == "atom") {
			if (token2?.type == "open_ct") {
				yield true
				return
			}
			let isinfix = this.infixop(token1.text)
			if (isinfix) {
				(token1 as infixToken).infix = isinfix
				yield true
				delete (token1 as any).infix
			}
			let ispostfix = this.postfixop(token1.text)
			if (ispostfix) {
				delete (token1 as any).infix;
				(token1 as postfixToken).postfix = ispostfix
				yield true
				delete (token1 as any ).postfix;
			}
		}
		yield true
	}

	prefix_is_atom(token: Token | undefined, P: number) {
		if (!token) {
			return true
		}
		if (isinfix(token)) {
			return token.infix.lPrec >= P
		}
		if (ispostfix(token)) {
			return token.postfix.lPrec >= P
		}

		switch (token?.text) {
			case ")":
			case "]":
			case "}":
				return true
			case "|":
				return 1100 >= P
			case ",":
				return 1000 >= P
			default:
				return false
		}
	}
	*exprtl0(S0: TokenIter, Term: CstNode, Prec: number, ctx: number) {
		let token0 = S0.val()
		let S1 = S0.next()
		if (!token0) {
			yield { Answer: Term, S: S0 }
			return
		}
		/**process ctxc */
		if (token0?.text == "," && ctx & F.COMMA_TERMINATES
			|| token0?.text == "|" && ctx & F.BAR_TERMINATES
			|| token0?.text == ":" && ctx & F.COLON_TERMINATES
		) {
			yield { S: S0, Answer: Term }
			return
		}
		if (token0.type == "atom") {


			let isambigop = this.ambigop(token0.text)
			if (isambigop) {

				(token0 as infixToken).infix = isambigop.infix
				yield* this.exprtl(S0, 0, Term, Prec, ctx)

				delete (token0 as any).infix;
				(token0 as postfixToken).postfix = isambigop.postfix
				yield* this.exprtl(S0, 0, Term, Prec, ctx)

				return
			}
			let isinfixop = this.infixop(token0.text)

			if (isinfixop) {
				(token0 as infixToken).infix = isinfixop
				yield* this.exprtl(S0, 0, Term, Prec, ctx)
				return
			}
			let ispostfixop = this.postfixop(token0.text)
			if (ispostfixop) {
				(token0 as postfixToken).postfix = ispostfixop
				yield* this.exprtl(S0, 0, Term, Prec, ctx)
				return
			}
		}
		if (token0.text == ",") {
			if (Prec >= 1000) {
				let r = this.read(S1, 1000, ctx).next().value
				if (!r) {
					return undefined
				}
				yield* this.exprtl(r.S, 1000, new infix_compound(token0, [Term, r.Answer]), Prec, ctx)
				return
			}

		}
		if (token0.text == "|") {
			if (Prec >= 1100) {
				let r = this.read(S1, 1100, ctx).next().value
				if (!r) {
					return undefined
				}
				yield* this.exprtl(r.S, 1100, new infix_compound(token0, [Term, r.Answer], ";"), Prec, ctx)
				return
			}
		}
		let r = this.cant_follow_expr(token0)
		if (r) {
			// syntax_error([Culprit,follows,expression], [Thing|S1]).
			error(tokenRange(token0), `${r} follows expression`, this)
			return

		}
		//没有读完 
		yield { Answer: Term, S: S0 }
	}
	cant_follow_expr(token: Token) {
		switch (token.type) {
			case "atom":
				return "atom"
			case "var":
				return "variable"
			case "integer":
				return "integer"
			case "string":
				return "string"
			case "open_ct":
			case "open":
			case "open_list":
			case "open_curly":
				return "bracket"
			default:
				return false
		}
	}
	*exprtl(S0: TokenIter, C: number, Term: CstNode, Prec: number, ctx: number)
		: Generator<AnsS> {
		let S1 = S0.next()
		let S2 = S1.next()
		let token0 = S0.val()
		let token1 = S1.val()
		let token2 = S2.val()
		if (token0) {
			if (isinfix(token0) && Prec >= token0.infix.opPrec && C <= token0.infix.lPrec) {
				for (let r of this.read(S1, token0.infix.rPrec, ctx)) {
					let Expr = new infix_compound(token0!, [Term, r.Answer])
					yield* this.exprtl(r.S, token0.infix.opPrec, Expr, Prec, ctx)
				}
				return
			}
			else if (ispostfix(token0) && Prec >= token0.postfix.opPrec && C <= token0.postfix.lPrec) {
				let Expr = new postfix_compound(token0!, [Term])
				for (let _ of this.peepop(token1, token2)) {
					yield* this.exprtl(S1, token0.postfix.opPrec, Expr, Prec, ctx)
				}
				return
			}
			if (token0.text == "," && Prec >= 1000 && C <= 1000) {
				for (let r of this.read(S1, 1000, ctx)) {
					yield* this.exprtl(r.S, 1000, new infix_compound(token0, [Term, r.Answer]), Prec, ctx)
				}
				return
			}
			if (token0.text == "|" && Prec >= 1100 && C <= 1100) {
				token0.value = ";"
				for (let r of this.read(S1, 1100, ctx)) {
					yield* this.exprtl(r.S, 1100, new infix_compound(token0, [Term, r.Answer]), Prec, ctx)
				}
				token0.value = "|"
				return
			}
		}
		yield { Answer: Term, S: S0 }
	}

	prefixop(text: string) {
		let prec: number | undefined
		prec = this.optable.current_op(text, 'fy',)
		if (prec) {
			return { opPrec: prec, rPrec: prec }
		}
		prec = this.optable.current_op(text, 'fx')
		if (prec) {
			return { opPrec: prec, rPrec: prec - 1 }
		}
		return undefined
	}
	postfixop(text: string): postfixop | undefined {
		let Prec
		Prec = this.optable.current_op(text, "yf")
		if (Prec) {
			return { opPrec: Prec, lPrec: Prec, type: "postfix" }
		}
		Prec = this.optable.current_op(text, "xf")
		if (Prec) {
			return { lPrec: Prec - 1, opPrec: Prec, type: "postfix" }
		}
		return undefined
	}
	infixop(text: string): infixop | undefined {
		let Prec
		Prec = this.optable.current_op(text, "xfx")
		if (Prec) {
			return { lPrec: Prec - 1, opPrec: Prec, rPrec: Prec - 1, type: "infix" }
		}
		Prec = this.optable.current_op(text, "xfy")
		if (Prec) {
			return { lPrec: Prec - 1, opPrec: Prec, rPrec: Prec, type: "infix" }
		}
		Prec = this.optable.current_op(text, "yfx")
		if (Prec) {
			return { lPrec: Prec, opPrec: Prec, rPrec: Prec - 1, type: "infix" }
		}
		return undefined
	}

	ambigop(text: string) {
		const r = this.postfixop(text)
		if (!r)
			return undefined
		const r2 = this.infixop(text)
		if (!r2)
			return undefined
		return { postfix: r, infix: r2 }
	}
	[Symbol.iterator]() {
		let self = this
		let iter = {
			next() {
				let ast = self.next()
				return { value: ast, done: !ast }
			},

			[Symbol.iterator]: function () {
				return this
			}
		}
		return iter
	}

}

class TokenIter {
	tokens
	idx
	constructor(tokens: Token[], idx: number = 0) {
		this.tokens = tokens
		this.idx = idx
	}
	val(): Token | undefined {
		return this.tokens[this.idx]
	}
	next() {
		return new TokenIter(this.tokens, this.idx + 1)
	}
}
// /** debug */
// let parser = new MyParser()
// parser.reset(content);
// // parser.next()
// // parser.next()
// // let t =parser.next();
// // console.log(t);

// for (let t of parser){

// 	console.log(t);
// }



interface infixToken extends Token {
	infix: infixop
}
interface postfixToken extends Token {
	postfix: postfixop
}
function isinfix(x: Token | undefined): x is infixToken {
	return typeof x == "object" && "infix" in x
}
function ispostfix(x: Token | undefined): x is postfixToken {
	return typeof x == "object" && "postfix" in x
}
