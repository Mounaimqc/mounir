
# Algeria GeoJSON to inline SVG path converter
# Projects WGS84 coordinates to a 900x760 SVG viewBox

$geojson = Get-Content "algeria_wilayas.geojson" -Raw | ConvertFrom-Json

# Algeria bounding box: lon -8.67 to 11.99, lat 18.97 to 37.09
$minLon = -8.67
$maxLon = 11.99
$minLat = 18.97
$maxLat = 37.09
$svgW = 900
$svgH = 760

function Project-Point($lon, $lat) {
    $x = [math]::Round(($lon - $minLon) / ($maxLon - $minLon) * $svgW, 2)
    $y = [math]::Round((1 - ($lat - $minLat) / ($maxLat - $minLat)) * $svgH, 2)
    return @($x, $y)
}

function Coords-To-D($ringCoords) {
    $pts = @()
    foreach ($c in $ringCoords) {
        $lon = $c[0]
        $lat = $c[1]
        $xy = Project-Point $lon $lat
        $pts += "$($xy[0]),$($xy[1])"
    }
    $pts_arr = $pts -join " L "
    return "M $pts_arr Z"
}

function Feature-To-Path($feature) {
    $geom = $feature.geometry
    $d = ""
    if ($geom.type -eq "Polygon") {
        foreach ($ring in $geom.coordinates) {
            $d += Coords-To-D $ring
        }
    } elseif ($geom.type -eq "MultiPolygon") {
        foreach ($poly in $geom.coordinates) {
            foreach ($ring in $poly) {
                $d += Coords-To-D $ring
            }
        }
    }
    return $d
}

$paths = @()
foreach ($feature in $geojson.features) {
    $code = $feature.properties.city_code
    $name = $feature.properties.name
    $d = Feature-To-Path $feature
    if ($d) {
        $paths += "  { code: '$code', name: '$name', d: `"$d`" }"
    }
}

$output = "const ALGERIA_PATHS = [`n" + ($paths -join ",`n") + "`n];"
$output | Out-File -FilePath "algeria_paths.js" -Encoding UTF8
Write-Host "Generated $($paths.Count) paths"
Write-Host "File size: $((Get-Item algeria_paths.js).Length) bytes"
