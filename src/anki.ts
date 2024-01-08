export interface SendCardRequest {
    deck: string,
    front: string, 
    back: string, 
    tags: string[]
}

export class AnkiConnect {

    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    sendCard(args: SendCardRequest) {
        const data = JSON.stringify({
            "action":"addNote",
            "version":23, 
            "params": { 
                "note": { 
                    "deckName":args.deck, 
                    "modelName":"Basic", 
                    "fields": {
                        "Front": args.front,
                        "Back": args.back
                    },
                    "tags": args.tags,
                }
            }
        }).replaceAll('\\n','<br>') // Replace newlines with breaks or anki will change them to spaces
        fetch(this.url,{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: data
        }).catch(error => {
            console.error(error)
        })
    }

    async deckNames(): Promise<string[]> {
        const data = JSON.stringify({
            "action":"deckNames",
            "version":23
        })
        const response = await fetch(this.url,{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: data
        }).catch(error => {
            console.error(error)
        })

        if (response) {
            const json = await response.json() as {
                result: string[],
                error: string | null
            }

            if(json.error != null) {
                throw new Error(`Could not fetch deck names: ${json.error}`)
            }

            return json.result
        }

        throw new Error("Could not fetch deck names!")
    }

}