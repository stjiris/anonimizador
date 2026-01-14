import { Component, ReactNode } from "react";
import { UserFile } from "../core/UserFile";
import { Bicon, Button } from "../core/BootstrapIcons";
import { UserFileInterface } from "@/types/UserFile";

interface CatchErrorProps {
	userFile: UserFileInterface
	children: ReactNode
	setUserFile: (u: UserFile | undefined) => void
}

interface CatchErrorState {
	error: Error | undefined
}

export class CatchError extends Component<CatchErrorProps, CatchErrorState> {
	state: Readonly<CatchErrorState> = { error: undefined }

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
		this.setState({ error: error });
	}

	render(): ReactNode {
		if (this.state.error) {
			return <div className='container alert alert-danger'>
				<h4><Bicon n="exclamation-triangle" /> Ocurreu um erro no ficheiro {this.props.userFile.name}! ({this.state.error.name})</h4>
				<pre>
					<details>
						<summary>
							{this.state.error.message}
						</summary>
						{this.state.error.stack}
					</details>
				</pre>
				<Button i="x" text="Fechar ficheiro" className="btn btn-warning" onClick={() => this.props.setUserFile(undefined)} />
			</div>
		}
		else {
			return this.props.children;
		}
	}
}
