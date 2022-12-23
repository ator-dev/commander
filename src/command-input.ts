addEventListener("keydown", event => {
	if (event.key === "Escape") {
		return;
	}
	event.preventDefault();
	if (event.key === "Enter") {
		commandEntered(command, true);
		return;
	}
	if (event.key === "Backspace" || event.key === "Delete") {
		commandEntered("");
		return;
	}
	if (event.key.length === 1 && event.key !== " ") {
		commandEntered(command + event.key);
	}
});

let command = "";
let input: HTMLElement | null = null;

// TODO do not rely on storage being present
let operations: Array<Operation> = [];
const operationsRetrieval = chrome.storage.local.get("operations").then(storage => {
	operations = storage["operations"];
});

let popupClass = "";
chrome.storage.local.get("popupClass").then(async storage => {
	popupClass = storage["popupClass"];
	await operationsRetrieval;
	operations.filter(operation => operation.operator === "begin" && operation.operands[0].label === popupClass).forEach(operation => {
		// TODO only use the appropriate prefix operation (corresponding to the shortcut used to open the popup)
		commandEntered(operation.operands[1].label + command);
	});
});

const commandEntered = async (commandNew: string, submit = false) => {
	if (submit) {
		const operation = operations.filter(({ operator, operands }) => operator === "complete" && (new RegExp(`\\b${operands[0].label}\\b`, "g")).test(commandNew))[0];
		commandNew += operation.operands[1].label;
	}
	command = commandNew;
	if (input) {
		input.textContent = command;
	}
	const operationsApplicable = operations
		.filter(({ operator, operands }) => operator === "map" && (new RegExp(`\\b${operands[0].label}\\b`, "g")).test(command));
	for (const { operands: [ pattern, action, replacement ] } of operationsApplicable) {
		if (action.label.split(".")[0] === "meta") {
			if (action.label === "meta.popup.close") {
				close();
			}
			return;
		}
		chrome.runtime.sendMessage({
			type: "invocation",
			command,
			key: action.label,
			args: { shift: action.arguments[0] },
		});
		if (replacement !== undefined) {
			command = replacement.label === "\"\"" ? "" : replacement.label;
			if (input) {
				input.textContent = command;
			}
		}
	}
};

addEventListener("keyup", event => {
	event.preventDefault();
	if (event.key.length === 1 && event.key !== " " && !command.includes(event.key)) {
		commandEntered(command + event.key);
	}
});

addEventListener("blur", () => {
	//close();
});

const popupInsert = (container: HTMLElement) => {
	const style = document.createElement("style");
	style.textContent = `
body {
	background: black;
	border-color: black;
	color: hsl(120 100% 50%);
	font-size: 24px;
	font-family: monospace;
	width: 116px;
	height: 20px;
	display: flex;
	align-items: center;
	user-select: none;
	overflow: clip;
}
	`;
	document.head.appendChild(style);
	input = container.appendChild(document.createElement("span"));
	input.textContent = command;
};

popupInsert(document.body);
