# Fix "Connection Refused" for 38.97.62.139

The app **is running** on the server (port 3000). "Connection refused" happens because the **hosting provider's firewall** is blocking inbound traffic.

## Do this

1. **Log in to the control panel** where you manage the server 38.97.62.139 (e.g. Prik / cloud.prik.net, or your VPS provider).

2. **Open the firewall / security / network rules** for this server.

3. **Add an inbound rule:**
   - **Protocol:** TCP  
   - **Port:** 3000  
   - **Source:** 0.0.0.0/0 (or "Anywhere" / "All")

4. **Save** the rule.

5. **In your browser open:**  
   **http://38.97.62.139:3000**

---

If your provider only allows opening port **80**, we can put the app behind a reverse proxy on 80 later. For now, opening **port 3000** is enough.