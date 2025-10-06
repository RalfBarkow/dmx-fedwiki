// src/main/java/ch/dreyeck/fedwiki/FedWikiPlugin.java
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
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONObject;
import org.codehaus.jettison.json.JSONException;

@Path("/fedwiki")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)    // default; methods below override to TEXT_PLAIN where needed
public class FedWikiPlugin extends PluginActivator {

    private static final String FEDWIKI_BASE = "http://localhost:3000/";
    private final Logger log = Logger.getLogger(getClass().getName());

    // --- health & raw proxy ----------------------------------------------------

    @GET @Path("ping")
    @Produces(MediaType.TEXT_PLAIN)
    public String ping() {
        return "fedwiki ok";
    }

    @GET @Path("proxy")
    public Response proxy(@QueryParam("url") String url) {
        if (url == null || url.trim().isEmpty()) {
            return jsonError(Response.Status.BAD_REQUEST, "missing 'url' query param");
        }
        try {
            String raw = httpGet(resolve(url));
            return Response.status(200).type(MediaType.APPLICATION_JSON).entity(raw).build();
        } catch (Exception e) {
            log.warning("FedWiki proxy error: " + e.getMessage());
            return jsonError(Response.Status.INTERNAL_SERVER_ERROR, "proxy failure: " + safe(e.getMessage()));
        }
    }

    // --- TEXT ENDPOINTS --------------------------------------------------------

    /** List sitemap slugs, one per line. */
    @GET @Path("sitemap.txt")
    @Produces(MediaType.TEXT_PLAIN)
    public Response sitemapText() {
        try {
            String raw = httpGet(resolve("system/sitemap.json"));
            List<String> slugs = parseSitemapSlugs(raw);
            return Response.ok(String.join("\n", slugs), MediaType.TEXT_PLAIN).build();
        } catch (Exception e) {
            log.warning("sitemap.txt error: " + e.getMessage());
            return Response.status(502).type(MediaType.TEXT_PLAIN)
                    .entity("error: " + safe(e.getMessage())).build();
        }
    }

    /** Render a full page as plain text (title + story). */
    @GET @Path("page.txt")
    @Produces(MediaType.TEXT_PLAIN)
    public Response pageText(@QueryParam("slug") String slug,
                             @DefaultValue("true") @QueryParam("includeTitle") boolean includeTitle) {
        if (slug == null || slug.trim().isEmpty()) {
            return Response.status(400).type(MediaType.TEXT_PLAIN)
                    .entity("error: missing 'slug'").build();
        }
        try {
            JSONObject page = fetchPage(slug);
            String txt = renderPageToText(page, includeTitle, Integer.MAX_VALUE, Integer.MAX_VALUE);
            return Response.ok(txt, MediaType.TEXT_PLAIN).build();
        } catch (Exception e) {
            log.warning("page.txt error: " + e.getMessage());
            return Response.status(502).type(MediaType.TEXT_PLAIN)
                    .entity("error: " + safe(e.getMessage())).build();
        }
    }

    /** Render a compact synopsis as plain text (first N lines / chars). */
    @GET @Path("synopsis.txt")
    @Produces(MediaType.TEXT_PLAIN)
    public Response synopsisText(@QueryParam("slug") String slug,
                                 @DefaultValue("8")  @QueryParam("maxLines") int maxLines,
                                 @DefaultValue("500") @QueryParam("maxChars") int maxChars,
                                 @DefaultValue("true") @QueryParam("includeTitle") boolean includeTitle) {
        if (slug == null || slug.trim().isEmpty()) {
            return Response.status(400).type(MediaType.TEXT_PLAIN)
                    .entity("error: missing 'slug'").build();
        }
        try {
            JSONObject page = fetchPage(slug);
            String txt = renderPageToText(page, includeTitle, maxLines, maxChars);
            return Response.ok(txt, MediaType.TEXT_PLAIN).build();
        } catch (Exception e) {
            log.warning("synopsis.txt error: " + e.getMessage());
            return Response.status(502).type(MediaType.TEXT_PLAIN)
                    .entity("error: " + safe(e.getMessage())).build();
        }
    }

    // --- helpers ---------------------------------------------------------------

    private static String resolve(String url) throws Exception {
        return new URL(new URL(FEDWIKI_BASE), url).toString();
    }

    private static String httpGet(String absUrl) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(absUrl).openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Accept", "application/json");
        int code = conn.getResponseCode();
        InputStream in = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
        String body = readAll(in);
        if (code < 200 || code >= 300) {
            throw new RuntimeException("Upstream " + code + " fetching " + absUrl + ": " + body);
        }
        return body;
    }

    private static String readAll(InputStream in) throws Exception {
        if (in == null) return "";
        try (BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder(); String line;
            while ((line = br.readLine()) != null) sb.append(line).append('\n');
            return sb.toString();
        }
    }

    private static Response jsonError(Response.Status status, String msg) {
        String json = "{\"error\":\"" + safe(msg) + "\"}";
        return Response.status(status).type(MediaType.APPLICATION_JSON).entity(json).build();
    }

    private static String safe(String s) {
        return (s == null) ? "" : s.replace("\"", "\\\"");
    }

    // --- FedWiki parsing/rendering --------------------------------------------

    private static List<String> parseSitemapSlugs(String raw) throws JSONException {
        // sitemap can be an array OR {data:[...]}
        try {
            JSONObject obj = new JSONObject(raw);
            if (obj.has("data")) {
                return slugsFromArray(obj.getJSONArray("data"));
            }
        } catch (JSONException ignore) {
            // not an object, try array
        }
        JSONArray arr = new JSONArray(raw);
        return slugsFromArray(arr);
    }

    private static List<String> slugsFromArray(JSONArray arr) throws JSONException {
        List<String> slugs = new ArrayList<>();
        for (int i = 0; i < arr.length(); i++) {
            Object it = arr.get(i);
            if (it instanceof String) {
                slugs.add((String) it);
            } else if (it instanceof JSONObject) {
                JSONObject o = (JSONObject) it;
                if (o.has("slug")) slugs.add(o.optString("slug"));
            }
        }
        return slugs;
    }

    private static JSONObject fetchPage(String slug) throws Exception {
        String raw = httpGet(resolve(slug + ".json"));
        return new JSONObject(raw);
    }

    /** Render a page to plain text with optional truncation. */
    private static String renderPageToText(JSONObject page, boolean includeTitle, int maxLines, int maxChars)
            throws JSONException {
        StringBuilder out = new StringBuilder();
        String title = page.optString("title", "");
        if (includeTitle && !title.isEmpty()) {
            out.append(title).append('\n').append('\n');
        }
        JSONArray story = page.optJSONArray("story");
        if (story != null) {
            int lines = 0;
            for (int i = 0; i < story.length(); i++) {
                JSONObject block = story.optJSONObject(i);
                if (block == null) continue;
                String type = block.optString("type", "paragraph");
                String text = block.optString("text", "");

                String rendered = renderBlock(type, text, block);
                if (rendered == null || rendered.isEmpty()) continue;

                for (String ln : rendered.split("\n", -1)) {
                    if (ln.trim().isEmpty()) continue;
                    if (lines >= maxLines || out.length() + ln.length() + 1 > maxChars) {
                        return out.toString().trim();
                    }
                    out.append(ln).append('\n');
                    lines++;
                }
            }
        }
        return out.toString().trim();
    }

    /** Very simple plaintext renderer for common FedWiki block types. */
    private static String renderBlock(String type, String text, JSONObject block) {
        switch (type) {
            case "paragraph":
            case "markdown":
            case "html":       // naive: just take text
            case "quote":
                return text;

            case "bullet":
                // bullets may be multiline; prefix each line
                String[] lines = text.split("\n", -1);
                StringBuilder sb = new StringBuilder();
                for (String l : lines) {
                    if (!l.trim().isEmpty()) sb.append("- ").append(l.trim()).append('\n');
                }
                return sb.toString().trim();

            case "pagefold":   // section header in FedWiki
            case "heading":
                return "# " + (text == null ? "" : text.trim());

            case "code":
                // indent code as plain text
                StringBuilder code = new StringBuilder();
                for (String l : text.split("\n", -1)) code.append("    ").append(l).append('\n');
                return code.toString().trim();

            case "image":
                String caption = block.optString("caption", "");
                String url = block.optString("url", block.optString("href", ""));
                if (!caption.isEmpty() && !url.isEmpty()) return "[img] " + caption + " <" + url + ">";
                if (!url.isEmpty()) return "[img] " + url;
                return "[img]";

            case "reference":
            case "transclusion":
                String slug = block.optString("slug", "");
                String site = block.optString("site", "");
                if (!slug.isEmpty()) return "↗ " + slug + (site.isEmpty() ? "" : " @" + site);
                return "↗ reference";

            default:
                // unknown block: best effort
                return text;
        }
    }
}
