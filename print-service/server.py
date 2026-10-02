#!/usr/bin/env python3

from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import subprocess
import urllib.parse


# ============================================================
# CONFIGURATION
# ============================================================

PRINTER = "Zebra_Technologies_ZTC_ZD230_203dpi_ZPL"

HOST = "127.0.0.1"
PORT = 8787


# ============================================================
# LOAD HTML PAGE
# ============================================================

with open("index.html", "rb") as f:
    HTML = f.read()


# ============================================================
# ZPL HEX ENCODING
# ============================================================

def zpl_escape(text):
    """
    Convert UTF-8 text to ZPL hexadecimal format.

    Example:
        Narendra Sirisipalli

    becomes:
        \\4E\\61\\72...

    ^FH\\ tells the Zebra printer to interpret
    these values as hexadecimal characters.
    """

    data = text.encode("utf-8")

    return "".join(
        "\\" + format(byte, "02X")
        for byte in data
    )


# ============================================================
# QR SIZING
#
# The QR now carries the full file-info text (7 lines), not a
# short URL, so its rendered size varies a lot with payload
# length. A fixed magnification/position (as before) either
# overflows the label or overlaps the file number. Instead we
# work out the QR's actual module count from the payload's byte
# length (ISO/IEC 18004 byte-mode capacity table, ECC level L —
# matches the "L" in the ^FDLA field below), pick a magnification
# that keeps it inside a fixed box, and center + stack from that.
# ============================================================

QR_BYTE_CAPACITY_L = {
    1: 17, 2: 32, 3: 53, 4: 78, 5: 106, 6: 134, 7: 154, 8: 192, 9: 230, 10: 271,
    11: 321, 12: 367, 13: 425, 14: 458, 15: 520, 16: 586, 17: 644, 18: 718, 19: 792, 20: 858,
    21: 929, 22: 1003, 23: 1091, 24: 1171, 25: 1273, 26: 1367, 27: 1465, 28: 1528, 29: 1628, 30: 1732,
    31: 1840, 32: 1952, 33: 2068, 34: 2188, 35: 2303, 36: 2431, 37: 2563, 38: 2699, 39: 2809, 40: 2953,
}


def qr_module_count(data_byte_length):
    """Smallest QR version (ECC L, byte mode) that fits the data, converted to module count (4*version + 17)."""
    for version, capacity in QR_BYTE_CAPACITY_L.items():
        if data_byte_length <= capacity:
            return 4 * version + 17
    return 4 * 40 + 17  # oversized payload — fall back to the largest version


# ============================================================
# CREATE ZPL LABEL
# ============================================================

LABEL_WIDTH = 400
LABEL_HEIGHT = 320
MAX_QR_BOX = 260   # QR is scaled to fit inside this square, leaving margin + room for the file number below
TOP_MARGIN = 16
NAME_GAP = 14
NAME_HEIGHT = 34   # ^A0N,24,24 line height + padding


def make_zpl(qr_data, file_name):

    qr = zpl_escape(qr_data)
    name = zpl_escape(file_name)

    # +2 accounts for the "LA" (error-correction + mode) prefix ZPL adds to ^FD
    data_byte_length = len(qr_data.encode("utf-8")) + 2
    modules = qr_module_count(data_byte_length)

    magnification = max(1, min(10, MAX_QR_BOX // modules))
    qr_size_px = modules * magnification

    qr_x = max(0, (LABEL_WIDTH - qr_size_px) // 2)
    qr_y = TOP_MARGIN

    # Keep the file number on the label even if the QR ran long
    name_y = min(qr_y + qr_size_px + NAME_GAP, LABEL_HEIGHT - NAME_HEIGHT)

    zpl = [

        # Start label
        "^XA",

        # UTF-8
        "^CI28",

        # ----------------------------------------------------
        # LABEL SIZE
        #
        # 50 mm × 40 mm
        # 203 DPI
        #
        # approximately 400 × 320 dots
        # ----------------------------------------------------

        f"^PW{LABEL_WIDTH}",
        f"^LL{LABEL_HEIGHT}",
        "^LH0,0",

        # ----------------------------------------------------
        # QR CODE
        #
        # Centered horizontally, sized to fit MAX_QR_BOX based
        # on the actual payload length.
        # ----------------------------------------------------

        f"^FO{qr_x},{qr_y}",

        f"^BQN,2,{magnification}",

        # IMPORTANT:
        # ^FH\ enables hexadecimal interpretation
        "^FH\\^FDLA" + qr + "^FS",

        # ----------------------------------------------------
        # FILE NAME
        #
        # Always placed below the QR's actual rendered bottom
        # edge, never a fixed offset.
        # ----------------------------------------------------

        f"^FO20,{name_y}",

        # Font size
        "^A0N,24,24",

        # Center filename
        f"^FB{LABEL_WIDTH - 40},1,0,C,0",

        # Filename
        "^FH\\^FD" + name + "^FS",

        # End label
        "^XZ"
    ]

    return "\n".join(zpl) + "\n"


# ============================================================
# HTTP HANDLER
# ============================================================

class Handler(BaseHTTPRequestHandler):

    # --------------------------------------------------------
    # SEND RESPONSE
    # --------------------------------------------------------

    def send_headers(
        self,
        status=200,
        content_type="text/html; charset=utf-8"
    ):

        self.send_response(status)

        self.send_header(
            "Content-Type",
            content_type
        )

        self.send_header(
            "Access-Control-Allow-Origin",
            "*"
        )

        self.send_header(
            "Access-Control-Allow-Methods",
            "POST, GET, OPTIONS"
        )

        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type"
        )

        self.send_header(
            "Cache-Control",
            "no-cache"
        )

        self.end_headers()


    # --------------------------------------------------------
    # OPTIONS (CORS preflight)
    #
    # The Next.js app runs on a different origin
    # (http://localhost:3000), so the browser sends an
    # OPTIONS preflight before the actual POST /print
    # request. Without a response here, the browser blocks
    # the POST and the fetch fails as a generic network
    # error before this server ever sees it.
    # --------------------------------------------------------

    def do_OPTIONS(self):

        self.send_headers(204)


    # --------------------------------------------------------
    # GET /
    # --------------------------------------------------------

    def do_GET(self):

        path = urllib.parse.urlparse(
            self.path
        ).path

        if path == "/":

            self.send_headers()

            self.wfile.write(
                HTML
            )

            return

        self.send_headers(
            404,
            "text/plain; charset=utf-8"
        )

        self.wfile.write(
            b"Not Found"
        )


    # --------------------------------------------------------
    # POST /print
    # --------------------------------------------------------

    def do_POST(self):

        if self.path != "/print":

            self.send_headers(
                404,
                "application/json"
            )

            self.wfile.write(
                json.dumps({
                    "ok": False,
                    "error": "Endpoint not found"
                }).encode()
            )

            return

        try:

            # ------------------------------------------------
            # READ REQUEST
            # ------------------------------------------------

            content_length = int(
                self.headers.get(
                    "Content-Length",
                    "0"
                )
            )

            body = self.rfile.read(
                content_length
            )

            data = json.loads(
                body
            )


            # ------------------------------------------------
            # GET QR DATA
            # ------------------------------------------------

            qr_data = str(
                data.get(
                    "qrData",
                    ""
                )
            ).strip()


            # ------------------------------------------------
            # GET FILE NAME
            # ------------------------------------------------

            file_name = str(
                data.get(
                    "fileName",
                    ""
                )
            ).strip()


            # ------------------------------------------------
            # VALIDATION
            # ------------------------------------------------

            if not qr_data:

                raise ValueError(
                    "QR Data is empty"
                )

            if not file_name:

                raise ValueError(
                    "File Name is empty"
                )


            # ------------------------------------------------
            # CREATE ZPL
            # ------------------------------------------------

            zpl = make_zpl(
                qr_data,
                file_name
            )


            # ------------------------------------------------
            # TERMINAL DEBUG
            # ------------------------------------------------

            print("")
            print("======================================")
            print("          NEW PRINT REQUEST")
            print("======================================")

            print("")
            print("QR DATA:")
            print(qr_data)

            print("")
            print("FILE NAME:")
            print(file_name)

            print("")
            print("PRINTER:")
            print(PRINTER)

            print("")
            print("ZPL:")
            print("--------------------------------------")
            print(zpl)
            print("--------------------------------------")


            # ------------------------------------------------
            # SEND ZPL TO CUPS
            # ------------------------------------------------

            result = subprocess.run(

                [
                    "lp",
                    "-d",
                    PRINTER,
                    "-o",
                    "raw"
                ],

                input=zpl.encode(
                    "utf-8"
                ),

                stdout=subprocess.PIPE,

                stderr=subprocess.PIPE
            )


            # ------------------------------------------------
            # CHECK RESULT
            # ------------------------------------------------

            if result.returncode != 0:

                error_message = (
                    result.stderr
                    .decode(
                        errors="replace"
                    )
                    .strip()
                )

                raise RuntimeError(
                    error_message
                )


            # ------------------------------------------------
            # REQUEST ID
            # ------------------------------------------------

            request_id = (
                result.stdout
                .decode(
                    errors="replace"
                )
                .strip()
            )


            print("")
            print("PRINT SUCCESS:")
            print(request_id)

            print("======================================")
            print("")


            # ------------------------------------------------
            # RESPONSE
            # ------------------------------------------------

            self.send_headers(
                200,
                "application/json"
            )

            self.wfile.write(
                json.dumps({
                    "ok": True,
                    "request": request_id,
                    "printer": PRINTER,
                    "message": "Print job sent successfully"
                }).encode()
            )


        except Exception as e:

            print("")
            print("======================================")
            print("             PRINT ERROR")
            print("======================================")
            print(str(e))
            print("")


            self.send_headers(
                500,
                "application/json"
            )

            self.wfile.write(
                json.dumps({
                    "ok": False,
                    "error": str(e)
                }).encode()
            )


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    print("")
    print("======================================")
    print("       ZEBRA QR PRINT SERVER")
    print("======================================")
    print("")

    print("Printer:")
    print(PRINTER)

    print("")

    print("Label:")
    print("50 mm × 40 mm")

    print("")

    print("Resolution:")
    print("203 DPI")

    print("")

    print("QR Magnification:")
    print("5")

    print("")

    print("QR Position:")
    print("X = 135")
    print("Y = 30")

    print("")

    print("File Name Position:")
    print("X = 20")
    print("Y = 235")

    print("")

    print("Web Application:")
    print(
        f"http://localhost:{PORT}"
    )

    print("")

    print("Waiting for print requests...")
    print("")


    server = HTTPServer(
        (
            HOST,
            PORT
        ),
        Handler
    )


    try:

        server.serve_forever()

    except KeyboardInterrupt:

        print("")
        print("Stopping Zebra QR Print Server...")

        server.server_close()

        print("Server stopped.")
