"""A small controller for the threeBrain hub (pip install -r requirements.txt).

    hub = await Hub.connect()              # passkey from THREEBRAIN_PASSKEY, else "17285"
    viewer = (await hub.viewers())[0]["id"]   # "v1", ...
    await hub.command(viewer, "background", "#000000")
    await hub.close()
"""
import asyncio
import itertools
import json
import os

import websockets


class HubError(Exception):
    """A request the hub or the viewer refused; `code` says why."""

    def __init__(self, code, message):
        super().__init__(f"{code}: {message}")
        self.code = code


class Hub:
    def __init__(self, socket, welcome):
        self.socket = socket
        self.welcome = welcome
        # viewer events (after subscribe) and viewer_joined / viewer_left notices
        self.events = asyncio.Queue()
        self._ids = itertools.count(1)
        self._waiting = {}
        self._reader = asyncio.create_task(self._read())

    @classmethod
    async def connect(cls, passkey=None, name="python"):
        passkey = (passkey or os.environ.get("THREEBRAIN_PASSKEY") or "17285").strip()
        port, _, key = passkey.partition(".")
        # screenshots can be large: no message size limit
        socket = await websockets.connect(f"ws://127.0.0.1:{int(port)}/", max_size=None)
        hello = {"type": "hello", "protocol": 1, "role": "controller", "name": name}
        if key:
            hello["key"] = key
        await socket.send(json.dumps(hello))
        try:
            welcome = json.loads(await socket.recv())
        except websockets.ConnectionClosed as closed:
            code = closed.rcvd.code if closed.rcvd else None
            why = "wrong or missing key" if code == 4401 else f"closed ({code})"
            raise HubError("refused", f"cannot join the hub on 127.0.0.1:{port}: {why}") from None
        return cls(socket, welcome)

    async def _read(self):
        try:
            async for raw in self.socket:
                message = json.loads(raw)
                if message.get("type") == "result":
                    future = self._waiting.pop(message.get("id"), None)
                    if future and not future.done():
                        future.set_result(message)
                else:
                    await self.events.put(message)
        except websockets.ConnectionClosed:
            pass
        finally:
            for future in self._waiting.values():
                if not future.done():
                    future.set_exception(HubError("closed", "the connection to the hub closed"))

    async def request(self, message, timeout=30):
        message = {**message, "id": f"p{next(self._ids)}"}
        future = asyncio.get_running_loop().create_future()
        self._waiting[message["id"]] = future
        await self.socket.send(json.dumps(message))
        reply = await asyncio.wait_for(future, timeout)
        if not reply.get("ok"):
            error = reply.get("error") or {}
            raise HubError(error.get("code", "error"), error.get("message", ""))
        return reply.get("value")

    async def viewers(self):
        """The viewers connected to the hub: id, title, subjects, origin, ..."""
        return await self.request({"type": "list"})

    async def command(self, viewer, name, value=None, timeout=30):
        """Runs one viewer command and returns its result."""
        return await self.request({"type": "command", "target": viewer, "name": name, "value": value}, timeout)

    async def subscribe(self, names="*", targets="*"):
        """Viewer events with these names then arrive in `self.events`."""
        return await self.request({"type": "subscribe", "targets": targets, "names": names})

    async def close(self):
        await self.socket.close()
        self._reader.cancel()
