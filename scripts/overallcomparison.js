let deselectColor = "#eee";

generateSplom();

function generateSplom() {
    let width = 1200;
    let padding = 20;
    let size;

    let c = { Grass: "#78c850", Fire: "#F08030", Water: "#6890f0", Bug: "#a8b820", Normal: "#a8a878", Dark: "#000000", Poison: "#a040a0", Electric: "#f8d030", Ground: "#e0c068", Ice: "#98D8D8", Fairy: "#ee99ac", Steel: "#b8b8d0", Fighting: "#c03028", Psychic: "#f85888", Rock: "#b8a038", Ghost: "#705898", Dragon: "#7038f8", Flying: "#a890f0" }

    let pokemonData = [];

    let columns = [];

    d3.csv("../pokedex.csv").then(function (data) {
        pokemonData = data;
        columns = data.columns.filter(d => filterStats(d));
        size = (width - (columns.length + 1) * padding) / columns.length + padding;
        buildSplom(data);

    });

    let x;
    let y;

    function buildSplom(data) {
        let svg = d3.create("svg")
            .attr("width", width)
            .attr("viewBox", [-padding, 0, width, width]);

        svg.append("style")
            .text(`circle.hidden{fill:#000;fill-opacity:1;r:1px;}`);

        x = columns.map(c => d3.scaleLinear()
            .domain(d3.extent(data, d => parseInt(d[c])))
            .rangeRound([padding / 2, size - padding / 2]));

        y = x.map(x => x.copy().range([size - padding / 2, padding / 2]));

        svg.append("g")
            .call(xAxis());

        svg.append("g")
            .call(yAxis());

        let cell = svg.append("g")
            .selectAll("g")
            .data(d3.cross(d3.range(columns.length), d3.range(columns.length)))
            .join("g")
            .attr("transform", ([i, j]) => `translate(${i * size},${j * size})`);

        cell.append("rect")
            .attr("fill", "none")
            .attr("stroke", "#aaa")
            .attr("x", padding / 2 + 0.5)
            .attr("y", padding / 2 + 0.5)
            .attr("width", size - padding)
            .attr("height", size - padding);

        cell.each(function ([i, j]) {
            d3.select(this).selectAll("circle")
                .data(data.filter(d => !isNaN(d[columns[i]]) && !isNaN(d[columns[j]])))
                .join("circle")
                .attr("cx", d => x[i](d[columns[i]]))
                .attr("cy", d => y[j](d[columns[j]]));
        });

        let circle = cell.selectAll("circle")
            .attr("r", 3.5)
            .attr("fill", d => c[d.type_1])
            .attr("id", d => d.id);

        // Currently not working because the brush is over the dots
        // circle.append("title")
        //     .text(d => d.name);

        cell.call(brush, circle, svg, data);

        svg.append("g")
            .style("font", "bold 10px sans-serif")
            .style("pointer-events", "none")
            .selectAll("text")
            .data(columns)
            .join("text")
            .attr("transform", (d, i) => `translate(${i * size},${i * size})`)
            .attr("x", padding)
            .attr("y", padding)
            .attr("dy", ".71em")
            .text(d => d);

        svg.property("value", []);
        document.getElementById("scattermatrix").appendChild(svg.node());
    }

    function xAxis() {
        let axis = d3.axisBottom()
            .ticks(6)
            .tickSize(size * columns.length);
        return g => g.selectAll("g").data(x).join("g")
            .attr("transform", (d, i) => `translate(${i * size},0)`)
            .each(function (d) { return d3.select(this).call(axis.scale(d)); })
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line").attr("stroke", "#eee"));
    }

    function yAxis() {
        let axis = d3.axisLeft()
            .ticks(6)
            .tickSize(-size * columns.length);
        return g => g.selectAll("g").data(y).join("g")
            .attr("transform", (d, i) => `translate(0,${i * size})`)
            .each(function (d) { return d3.select(this).call(axis.scale(d)); })
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line").attr("stroke", "#eee"));
    }



    function brush(cell, circle, svg, data) {
        let brush = d3.brush()
            .extent([[padding / 2, padding / 2], [size - padding / 2, size - padding / 2]])
            .on("start", brushstarted)
            .on("brush", brushed)
            .on("end", brushend);

        cell.call(brush);

        let brushcell;

        function brushstarted() {
            if (brushcell !== this) {
                d3.select(brushcell).call(brush.move, null);
                brushcell = this;
            }
        }

        function brushed({ selection }, [i, j]) {
            let parallelSelection = document.getElementById("parallelaxes").getElementsByClassName("selection")
            if(parallelSelection){
                for(let i=0;i<parallelSelection.length;i++){
                    parallelSelection[i].style.display = "none";
                }
            }

            let selected = [];
            if (selection) {
                let [[x0, y0], [x1, y1]] = selection;
                circle.classed("hidden",
                    d => x0 > x[i](d[columns[i]]) ||
                        x1 < x[i](d[columns[i]]) ||
                        y0 > y[j](d[columns[j]]) ||
                        y1 < y[j](d[columns[j]]));
                selected = data.filter(
                    d => x0 < x[i](d[columns[i]]) &&
                        x1 > x[i](d[columns[i]]) &&
                        y0 < y[j](d[columns[j]]) &&
                        y1 > y[j](d[columns[j]]));
            }

            let parallel = d3.select("#parallelaxes svg");
            let path = parallel.selectAll("path");
            path.each(function (d) {
                let active = false;
                selected.forEach(function(e){
                    if(d !== null){
                        if(d.id === e.id){
                            active = true;
                            return true;
                        }   
                    }
                });
                d3.select(this).style("stroke", active ? c[d.type_1] : deselectColor);
                if (active) {
                    d3.select(this).raise();
                }
            });

            parallel.property("value", selected).dispatch("input");
            svg.property("value", selected).dispatch("input");
        }

        function brushend({ selection }) {
            if (selection) {
                return;
            }
            let parallel = d3.select("#parallelaxes svg")
            let path = parallel.selectAll("path");
            path.each(function (d) {
                if(d !== null){
                    d3.select(this).style("stroke", c[d.type_1]);
                }
            });


            parallel.property("value", []).dispatch("input");
            svg.property("value", []).dispatch("input");
            circle.classed("hidden", false);
        }
    }
}

// Filters the data based on the specific column
function filterStats(d) {
    if (d === "hp" || d === "attack" || d === "defense" || d === "sp_attack" || d === "sp_defense" || d === "speed") {
        return true;
    }
    return false;
}

generateParallelAxis();
function generateParallelAxis() {
    d3.csv("../pokedex.csv").then(function (data) {
        // Set up the SVG properties
        let margin = ({ top: 25, right: 30, bottom: 20, left: 20 });

        let keys = data.columns.filter(d => filterStats(d));

        let width = keys.length * 160;
        let height = width / 2;

        let y = new Map(Array.from(keys, key => [key, d3.scaleLinear(d3.extent(data, d => parseInt(d[key])), [margin.top, height - margin.bottom])]));

        let x = d3.scalePoint(keys, [margin.right, width - margin.left]);

        let c = { Grass: "#78c850", Fire: "#F08030", Water: "#6890f0", Bug: "#a8b820", Normal: "#a8a878", Dark: "#000000", Poison: "#a040a0", Electric: "#f8d030", Ground: "#e0c068", Ice: "#98D8D8", Fairy: "#ee99ac", Steel: "#b8b8d0", Fighting: "#c03028", Psychic: "#f85888", Rock: "#b8a038", Ghost: "#705898", Dragon: "#7038f8", Flying: "#a890f0" };

        let brushWidth = 50;

        // Create the SVG
        let svg = d3.create("svg")
            .attr("width", width)
            .attr("viewBox", [0, 0, width, height]);

        // Create the brush
        // Using brushY because the x axis doesn't matter here
        let brush = d3.brushY()
            .extent([
                [-(brushWidth / 2), margin.top],
                [brushWidth / 2, height - margin.bottom]
            ])
            .on("start brush end", brushed);

        // Define the function for creating the lines
        let line = d3.line()
            .defined(([, value]) => value != null)
            .y(([key, value]) => y.get(key)(value))
            .x(([key]) => x(key))

        // Create the paths for the parallel axes
        let path = svg.append("g")
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .selectAll("path")
            .data(data)
            .join("path")
            .attr("stroke", d => c[d["type_1"]])
            .attr("id",d => d.id)
            .attr("d", d => line(d3.cross(keys, [d], (key, d) => [key, parseInt(d[key])])))

        // Add a mouseover title to the paths
        // Needs to be added here, if just .append at the end of the previous .attr, let path will be the titles instead of the lines
        path.append("title")
            .text(d => d.name);

        // Create each of the axes and their brushes
        svg.append("g")
            .selectAll("g")
            .data(keys)
            .join("g")
            .attr("transform", d => `translate(${x(d)},0)`)
            .each(function (d) { d3.select(this).call(d3.axisLeft(y.get(d))); })
            .call(g => g.append("text")
                .attr("y", margin.top - 15)
                .attr("x", -20)
                .attr("text-anchor", "start")
                .attr("fill", "currentColor")
                .text(d => d))
            .call(g => g.selectAll("text")
                .clone(true).lower()
                .attr("fill", "none")
                .attr("stroke-width", 3)
                .attr("stoke-linejoin", "round")
                .attr("stroke", "white"))
            .call(brush);

        // The range of the brush selection
        let selections = new Map();

        function brushed({ selection }, key) {
            let splom = document.getElementById("scattermatrix").getElementsByClassName("selection")
            if(splom){
                for(let i=0;i<splom.length;i++){
                    splom[i].style.display = "none";
                }
            }

            // Set up the selection brush, get it's coordinates
            if (selection === null) {
                selections.delete(key);
            } else {
                selections.set(key, selection.map(y.get(key).invert));
            }

            // Update the parallel axes to show which paths are selected
            // Also store the data of the selected
            const selected = [];
            path.each(function (d) {
                let active = Array.from(selections).every(([key, [min, max]]) => parseInt(d[key]) >= min && parseInt(d[key]) <= max);
                d3.select(this).style("stroke", active ? c[d.type_1] : deselectColor);
                if (active) {
                    d3.select(this).raise();
                    selected.push(d);
                }
            });

            // Get the contents of the Scatter plot matrix
            let scatter = d3.select("#scattermatrix svg")
            let circles= scatter.selectAll("circle");

            // Disable the dots that are not selected by the parallel axes
            circles.classed("hidden", d => circleClass(d));
            function circleClass(d){
                let hidden = true;
                selected.forEach(function(e){
                    if(d.id === e.id){
                        hidden = false;
                        return false;
                    }   
                });
                return hidden;
            }

            // Update the data property of the two svgs
            scatter.property("value", selected).dispatch("input");
            svg.property("value", selected).dispatch("input");
        }

        // Append the newly created SVG to the web page
        document.getElementById("parallelaxes").appendChild(svg.property("value", data).node());

    });
}