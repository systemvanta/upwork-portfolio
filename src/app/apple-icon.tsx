import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#81b09a",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 112,
            height: 112,
            padding: 12,
            justifyContent: "space-between",
            background: "#fffcf6",
            borderRadius: 28,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#8fbcfa" }} />
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f49eff" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#ffc753" }} />
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#79deeb" }} />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
