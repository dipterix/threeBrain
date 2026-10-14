"""Prints what the user clicks in a connected viewer.

    cd examples/WebSocket/Python
    python watch_clicks.py          # until Ctrl+C
    python watch_clicks.py 60       # for 60 seconds
"""
import asyncio
import sys

from hub_client import Hub


async def main(seconds):
    hub = await Hub.connect(name="watch_clicks.py")
    await hub.subscribe(["mouse_clicked"])
    print("Click something in the viewer " +
          (f"(watching for {seconds:g} s)" if seconds else "(Ctrl+C to stop)"), flush=True)
    loop = asyncio.get_running_loop()
    deadline = loop.time() + seconds if seconds else None
    try:
        while True:
            timeout = None if deadline is None else deadline - loop.time()
            if timeout is not None and timeout <= 0:
                break
            try:
                event = await asyncio.wait_for(hub.events.get(), timeout)
            except asyncio.TimeoutError:
                break
            if event.get("type") != "event":
                continue
            clicked = event["value"]
            if clicked.get("is_electrode"):
                position = ", ".join(f"{v:.1f}" for v in clicked["position"])
                print(f"[{event['source']}] contact {clicked['electrode_number']} of {clicked['subject']} "
                      f"at tkrRAS ({position})", flush=True)
            else:
                print(f"[{event['source']}] {clicked.get('name')}", flush=True)
    finally:
        await hub.close()


if __name__ == "__main__":
    try:
        asyncio.run(main(float(sys.argv[1]) if len(sys.argv) > 1 else None))
    except KeyboardInterrupt:
        pass
