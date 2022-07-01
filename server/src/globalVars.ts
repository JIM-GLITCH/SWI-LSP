import { DocumentUri } from 'vscode-languageserver'
import { FileState } from './fileState'
/**
 * use Singleton class to contain  "global variables"
 */
export class G{
	private static instance:G 
	private constructor() {
	}
	public static getInstance(){
		if(!this.instance){    
			this.instance = new G();
		}
		return this.instance;
	}
	
	/** 
	 * fileStateMap 用来根据DocumentUri 来确定fileState
	 */
	fileStateMap: Map<DocumentUri, FileState> = new Map()

}
