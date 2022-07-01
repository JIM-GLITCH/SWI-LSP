interface token {

}

class Lexer {
	text: string
	// buffer:Buffer
	/*  position */
	line: number
	char: number
	offset: number
	
	constructor(text="",line=0,char = 0,offset = 0){
		this.text=text
		this.line=  line
		this.char = char
		this.offset=offset
	}


	readFullStop(){

	}
	/**  
	 * consume  chars of a clause
	 */
	produceTokenList(): token[] | undefined {
		if (this.eos())
			return undefined
		const tokenList: token[] = []
		for (; ;) {
			const token = this.produceToken()
			if (!token) {
				break
			}
			tokenList.push(token)

		}
		return tokenList
	}

	/**
	 * consume chars of a token
	 */
	produceToken() {
		const layoutStartPos = this.savePos()
		const hasLeadingLayout = this.produceLayout()
		const tokenStartPos = this.savePos()
		const token = this.producePartialToken()

		

	}

	producePartialToken(){
		const pos = this.savePos()
		const ch = this.produceChar()
		switch (ch) {
			case "":
				return false;
			// case "%":
			// 	/* %comment line comment */
			// 	for(;;){
			// 		const ch = this.produceChar()
			// 		if(ch == "\n" ||ch == ""){
			// 			return true;
			// 		}
			// 	}
			case "!":
				return K.atom
			case "(":
				return K.open
			case ")":
				return K.close
			case ",":
				return K.comma
			case ";":
				return K.atom
			case "[":
				return K.open_list
			case "]":
				return K.close_list
			case "{":
				return K.open_curly
			case "|":
				return K.atom
			case "}":
				return K.close_curly
			case ".":
				return this.readFullStop()
			case "\"":
				return readString("\"")
			case "'":
				return readString("'")
			default:
				break;
		}
		if(ch == "_" || (ch>="A"&&ch<="Z")){
			
		}
	}

	produceLayout(){
		return this.oneMore(this.layoutText)
	}

	produceChar(){
		const char = this.text[this.offset]
		this.consume(char)
		return char
	}
	/* 处理 字符函数 */
	lookChar(){
		return this.text[this.offset]
	}

	lookStr(number: number){
		return this.text.slice(this.offset,this.offset+number)
	}

	consume(char:string){
		switch (char) {
			case "":
				break;
			case "\n":
				this.offset++
				this.line++
				this.char=0
				break;
			default:
				this.offset++
				this.char++
		}
	}

	layoutText(){
		return this.either(
			this.layoutChar,
			comment
		)
	}

	eos() {
		return this.offset >= this.text.length
	}
	
	/* 逻辑控制函数 */
	zeroMore(param: { (): boolean }){
		for(;;){
			const pos =this.savePos()
			if(!param())
				this.loadPos(pos)
				return true
		}
	
	}

	oneMore(param: () => boolean){
			/* 第一次必须成功 */
			const pos =this.savePos()
			if(!param()){
				this.loadPos(pos)
				return false;
			}
			return this.zeroMore(param)
	}

	either(...params: any[]){
		const pos = this.savePos()
		for (const param of params) {
			if(param())
				return true;
			this.loadPos(pos)
		}
		return false;
	}

	matchChar(char: string){
		if(char!=this.lookChar())
			return false;
		this.consume(char)
		return true
	}
	
	matchEitherChar(...chars: string[]){
		const ch = this.lookChar()
		for (const char of chars) {
			if(char ==ch)
				return true;
		}
		return false;
	}

	matchStr(str: string ){
		if(str != this.lookStr(str.length))
			return false;
		for (const ch of str) {
			this.consume(ch)
		}
	}

	/* 位置控制函数  */
	savePos():[number,number,number]{
		return [
			this.line,
			this.char,
			this.offset
		]
	}
	
	loadPos(pos:[number,number,number]){
		this.line=pos[0]
		this.char=pos[1]
		this.offset=pos[2]
	}
	/* 字符 函数 */
	layoutChar(){
		return this.either(
			this.spaceChar,
			this.horizontalTabChar,
			this.newLineChar
		)
	}
	
	spaceChar(){
		return this.matchChar(" ")
	}
	
	horizontalTabChar(){
		return this.matchChar("\t")
	}

	newLineChar(){
		return this.either(
			this.matchStr("\r\n"),
			this.matchEitherChar("\r","\n"),
		)
	}

	smallLetterChar(){
		const ch = this.lookChar()
		if("a"<=ch && ch<="z"){
			this.consume(ch)
			return true;
		}
		return false;
	}

	alphaNumericChar(){
		return this.either(
			this.alphaChar,
			this.decimalDigitChar
		)
	}

	alphaChar(){
		return this.either(
			this.underScoreChar,
			this.letterChar
		)
	}

	letterChar(){
		return this.either(
			this.capitalLetterChar,
			this.smallLetterChar
		)
	}

	capitalLetterChar(){
		const ch = this.lookChar()
		if("A"<=ch&&ch<="Z"){
			this.consume(ch)
			return true;
		}
		return false;
	}

	decimalDigitChar(){
		const ch =this.lookChar()
		if("0"<=ch&&ch<="9"){
			this.consume(ch)
			return true;
		}
		return false;
	}

	underscoreChar(){
		return this.matchChar("_");
	}

	decimalPointChar(){
		return this.matchChar(".");
	}

	underScoreChar(){
		return this.matchChar("_");
	}


}