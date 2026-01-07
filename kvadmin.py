import urllib.request
import urllib.parse
import urllib.error
import json
import hidden

def addtoken(url, secrets):
    return url + ("&" if "?" in url else "?") + "token=" + secrets['token']

secrets = hidden.denokv()
print(f"Verifying connection to {secrets['url']}...")

while True:
    cmd = input("\nEnter command (set, get, list, quit): ").strip().lower()
    if cmd == 'quit': break
    
    path = input("Enter path (e.g., /py4e/test): ").strip()
    full_url = secrets['url'] + ("/kv/" + cmd + path)
    
    if cmd == 'set':
        print("Enter JSON (finish with a blank line):")
        lines = []
        while True:
            line = input()
            if not line: break
            lines.append(line)
        data = json.loads("".join(lines))
        req = urllib.request.Request(addtoken(full_url, secrets), 
                                     data=json.dumps(data).encode('utf-8'), 
                                     headers={'Content-Type': 'application/json'}, 
                                     method='POST')
    else:
        req = urllib.request.Request(addtoken(full_url, secrets), method='GET')

    try:
        with urllib.request.urlopen(req) as response:
            print(json.dumps(json.loads(response.read()), indent=2))
    except Exception as e:
        print(f"Error: {e}")
