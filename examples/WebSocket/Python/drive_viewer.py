"""Drives a connected viewer: background, camera, panel settings, electrode
values, a selected contact and a title, then saves a screenshot.

    cd examples/WebSocket/Python
    pip install -r requirements.txt
    python drive_viewer.py

The hub must be running and a viewer connected to it (see ../README.md). The
electrode part expects the demo viewer from the README (subject N27, contacts
1-8). Set THREEBRAIN_PASSKEY when the hub uses another port or a key.
"""
import asyncio
import base64

from hub_client import Hub


async def main():
    hub = await Hub.connect(name="drive_viewer.py")
    try:
        viewers = await hub.viewers()
        if not viewers:
            raise SystemExit('No viewer is connected: in the viewer\'s control panel, enter the passkey in "Passkey" and click "Connect".')
        viewer = viewers[0]["id"]
        print(f"Driving viewer {viewer} showing {', '.join(viewers[0]['subjects'])}")

        await hub.command(viewer, "background", "#000000")
        # look from the left, slightly zoomed in
        await hub.command(viewer, "camera", {"position": [-500, 0, 0], "up": [0, 0, 1]})
        await hub.command(viewer, "zoom_level", 1.5)
        # any control panel value, by its name in the panel
        await hub.command(viewer, "controllers",
                          {"Show Panels": False, "Right Hemisphere": "hidden", "Left Opacity": 0.4})
        # a new variable for the contacts, shown right away
        await hub.command(viewer, "set_electrode_data", {
            "data": {"Electrode": list(range(1, 9)), "Subject": ["N27"] * 8, "Score": list(range(8, 0, -1))},
            "updateDisplay": True,
        })
        await hub.command(viewer, "focused_electrode", {"subject_code": "N27", "electrode": 3})
        await hub.command(viewer, "title", "Driven from Python")

        state = await hub.command(viewer, "get_state")
        print("Camera position:", state["cameraState"]["position"])

        shot = await hub.command(viewer, "capture")
        with open("viewer.png", "wb") as file:
            file.write(base64.b64decode(shot["dataURI"].split(",", 1)[1]))
        print("Saved viewer.png")
    finally:
        await hub.close()


if __name__ == "__main__":
    asyncio.run(main())
