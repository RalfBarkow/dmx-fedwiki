package ch.dreyeck.fedwiki;

import systems.dmx.core.osgi.PluginActivator;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.net.URL;
import java.net.HttpURLConnection;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.BufferedReader;
import java.util.logging.Logger;

@Path("/fedwiki")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class FedWikiPlugin extends PluginActivator {

    private final Logger log = Logger.getLogger(getClass().getName());
    private static final String FEDWIKI_BASE = "http://localhost:3000/";

    @GET
    @Path("ping")
    @Produces(MediaType.TEXT_PLAIN)
    public String ping() {
        return "fedwiki ok";
    }

    @GET
    @Path("proxy")
    public Response proxy(@QueryParam("url") String url) {
        if (url == null || url.trim().isEmpty()) {
            return jsonError(Response.Status.BAD_REQUEST, "missing 'url' query param");
        }
        try {
            URL target = new URL(new URL(FEDWIKI_BASE), url);
            HttpURLConnection conn = (HttpURLConnection) target.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");

            int status = conn.getResponseCode();
            InputStream stream = (status >= 200 && status < 300)
                    ? conn.getInputStream() : conn.getErrorStream();
            String body = readAll(stream);

            return Response.status(status)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(body != null ? body : "{}")
                    .build();

        } catch (Exception e) {
            log.warning("FedWiki proxy error: " + e.getMessage());
            return jsonError(Response.Status.INTERNAL_SERVER_ERROR,
                    "proxy failure: " + safe(e.getMessage()));
        }
    }

    // --- helpers ---

    private static Response jsonError(Response.Status status, String msg) {
        String json = "{\"error\":\"" + safe(msg) + "\"}";
        return Response.status(status).type(MediaType.APPLICATION_JSON).entity(json).build();
    }

    private static String safe(String s) {
        return (s == null) ? "" : s.replace("\"", "\\\"");
    }

    private static String readAll(InputStream in) throws Exception {
        if (in == null) return null;
        try (BufferedReader br = new BufferedReader(new InputStreamReader(in, "UTF-8"))) {
            StringBuilder sb = new StringBuilder(); String line;
            while ((line = br.readLine()) != null) sb.append(line);
            return sb.toString();
        }
    }
}
