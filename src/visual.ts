"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { legend, legendInterfaces } from 'powerbi-visuals-utils-chartutils';
import "./../style/visual.less";
import { axis, dataLabelUtils } from "powerbi-visuals-utils-chartutils";
import { displayUnitSystem, valueFormatter } from "powerbi-visuals-utils-formattingutils";
import { IValueFormatter } from "powerbi-visuals-utils-formattingutils/lib/src/valueFormatter";
import { IDropdown, ICategorySelection, IProperty, IDataPoint } from './interfaces'
import ISelectionId = powerbi.visuals.ISelectionId;
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualObjectInstance = powerbi.VisualObjectInstance
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import { VisualFormattingSettingsModel } from "./settings";
import * as d3 from "d3";
import { ItemDropdown } from "powerbi-visuals-utils-formattingmodel/lib/FormattingSettingsComponents";
import { LegendDataPoint, LineStyle, MarkerShape } from "powerbi-visuals-utils-chartutils/lib/legend/legendInterfaces";
import { LabelFormattedTextOptions } from "powerbi-visuals-utils-chartutils/lib/dataLabel/dataLabelInterfaces";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

export class Visual implements IVisual {
    private target: HTMLElement;
    private svg: Selection<SVGElement>
    private legend: legendInterfaces.ILegend
    private selectionIdBuilder: ISelectionIdBuilder;
    private events: IVisualEventService;
    private persistedProperties;
    private selectionManager
    private container: Selection<SVGElement>;
    private tableContainer: HTMLElement
    private allProperties
    private visualHost: IVisualHost

    private xAxis: Selection<SVGGElement>;
    private yAxis: Selection<SVGGElement>;
    private formattingSettingsService: FormattingSettingsService;
    private margin = { top: 20, right: 20, bottom: 30, left: 40 };
    private previousSelection: string
    private previousLegendSelection: string

    private tableFontSize: number
    private tableFontFamily: string
    private tableFontBold: boolean
    private tableFontUnderline: boolean
    private tableFontItalic: boolean
    private tableFontColor: string
    private tableDisplayUnits: number
    private tableSelectedCategory: string;
    private tableQueryName: string
    private tableBorderColor: string
    private tableBorderThickness: number

    private fontSizeAll: number
    private fontFamilyAll: string
    private fontBoldAll: boolean
    private fontUnderlineAll: boolean
    private fontItalicAll: boolean
    private fontColorAll: string
    private displayUnitsPropertyAll: number;

    private barColor: string
    private barSelectedCategory: string;
    private barTransparency: number
    private barTransparencyAll: number
    private barQueryName: string
    private barColors: string[] = ["#FF5733", "#3498DB", "#2ECC71", "#F39C12", "#9B59B6", "#E74C3C", "#1ABC9C", "#F1C40F", "#34495E", "#D35400"]
    private yAxisDisplayUnits: number

    private lineColor: string
    private lineSelectedCategory: string;
    private lineQueryName: string
    private lineColors: string[] = ["red", "#193be6", "#90EE90", "#ADD8E6", "#D8BFD8", "#F08080", "#AFEEEE", "#FAFAD2", "#D3D3D3", "#FFE4C4"]
    private dataLabelsSeries: boolean
    private legendSeries: boolean
    private legendPosition: string
    private lineStyleAll: string
    private lineStyle: string
    private markerSizeAll: number
    private markerSize: number

    private tooltipService: ITooltipService;
    private categorySelection: ICategorySelection[]

    private selectedDataPoint: { identity: ISelectionId; label: string; };
    private totalBars: IProperty[];
    private totalLines: IProperty[];
    private totalTableRows: IProperty[];

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.visualHost = options.host;
        this.events = this.visualHost.eventService;
        this.legend = legend.createLegend(this.target, false, 0);
        this.selectionIdBuilder = this.visualHost.createSelectionIdBuilder();
        this.selectionManager = this.visualHost.createSelectionManager();
        this.handleContextMenu();
        this.svg = d3.select(this.target)
            .append('svg')
        this.container = this.svg
            .append('g')
            .attr("transform", `translate(${this.margin.left * 2}, ${this.margin.top})`)
        this.xAxis = this.svg
            .append('g')
            .attr('class', 'axis')
        this.yAxis = this.svg
            .append('g')
            .attr("transform", `translate(${this.margin.left * 2}, 0)`)
            .attr('class', 'axis')
        this.tooltipService = options.host.tooltipService;
        this.tableContainer = document.createElement('div')
        this.tableContainer.classList.add('tableContainer')
        //this.persistState();
    }

    public update(options: VisualUpdateOptions) {
        try
        {
            this.events.renderingStarted(options)
            this.removeElements()
            const selectedSettings = options.dataViews[0].metadata.objects
            const getData = options.dataViews[0].categorical;
            let allCategories = getData.categories[0].values
            const allValues = getData.values

            //Handling Blank/Null values in category
            allCategories = allCategories.map(item => {
                if(item === null){
                    item = allCategories.includes('(Blank)') ? ' (Blank)' : '(Blank)'
                }
                return item
            })

            //Fetching property values
            this.allProperties = []
            this.fontSizeAll = this.getProperty<number>(selectedSettings, "tableData", "fontSize", 10)
            this.fontFamilyAll = this.getProperty<string>(selectedSettings, "tableData", "fontFamily", "wf_standard-font, helvetica, arial, sans-serif")
            this.fontBoldAll = this.getProperty<boolean>(selectedSettings, "tableData", "fontBold", false)
            this.fontUnderlineAll = this.getProperty<boolean>(selectedSettings, "tableData", "fontUnderline", false)
            this.fontItalicAll = this.getProperty<boolean>(selectedSettings, "tableData", "fontItalic", false)
            this.fontColorAll = this.getProperty<string>(selectedSettings, "tableData", "fontColor", "#000000") === "#000000" ? "#000000" : selectedSettings.tableData.fontColor['solid'].color
            this.displayUnitsPropertyAll = this.getProperty<number>(selectedSettings, "tableData", "displayUnitsProperty", 0)
            this.barTransparencyAll = this.getProperty<number>(selectedSettings, "barData", "transparency", 0)
            this.lineStyleAll = this.getProperty<string>(selectedSettings, "lineData", "style", "0")
            this.markerSizeAll = this.getProperty<number>(selectedSettings, "lineData", "marker", 1)

            allValues.forEach((label, i) => {
                const currentValue = options.dataViews[0].metadata.columns.filter(item => item.queryName === label.source.queryName)[0].objects
                const item = {
                    queryName: <string>label.source.queryName,
                    displayName: <string>label.source.displayName,
                    format: <string>label.source.format,
                    fontSize : this.getProperty<number>(currentValue,"tableData", "fontSize", this.fontSizeAll),
                    fontFamily : this.getProperty<string>(currentValue,"tableData", "fontFamily", this.fontFamilyAll),
                    fontBold : this.getProperty<boolean>(currentValue,"tableData", "fontBold", this.fontBoldAll),
                    fontUnderline : this.getProperty<boolean>(currentValue,"tableData", "fontUnderline", this.fontUnderlineAll),
                    fontItalic : this.getProperty<boolean>(currentValue,"tableData", "fontItalic", this.fontItalicAll),
                    fontColor : this.getProperty<string>(currentValue,"tableData", "fontColor", this.fontColorAll) === this.fontColorAll ? this.fontColorAll : currentValue.tableData.fontColor['solid'].color,
                    displayUnitsProperty : this.getProperty<number>(currentValue,"tableData", "displayUnitsProperty", this.displayUnitsPropertyAll),
                    barColor : this.getProperty<string>(currentValue,"barData", "fontColor", this.barColors[i]) ===  this.barColors[i] ?  this.barColors[i] : currentValue.barData.fontColor['solid'].color,
                    barTransparency : this.getProperty<number>(currentValue,"barData", "transparency", this.barTransparencyAll),
                    lineColor: this.getProperty<string>(currentValue,"lineData", "fontColor", this.lineColors[i]) ===  this.lineColors[i] ?  this.lineColors[i] : currentValue.lineData.fontColor['solid'].color,
                    lineStyle: this.getProperty<string>(currentValue,"lineData", "style", this.lineStyleAll),
                    markerSize: this.getProperty<number>(currentValue,"lineData", "marker", this.markerSizeAll),
                    tableSelection: this.getProperty<boolean>(currentValue,"tableData", "showSeries", true),
                    data: label.values,
                    category: allCategories,
                    role: label.source.roles["Bars"] ? "Bars" : "Lines"
                    //marker: dataPoints[i].role === "Bars" ? MarkerShape.square : MarkerShape.longDash
                }
                this.allProperties.push(item)
            })

            this.categorySelection = []
            const legendData = {
                dataPoints: [],
                labelColor: "black",
                fontSize: 8
            };
            for (let categoryIndex = 0; categoryIndex < allCategories.length; categoryIndex++) {
                for (let measureIndex = 0; measureIndex < allValues.length; measureIndex++) {
                    const measure = allValues[measureIndex];
                    const selectionIdBuilder = this.visualHost.createSelectionIdBuilder();

                    selectionIdBuilder.withCategory(getData.categories[0], categoryIndex);
                    selectionIdBuilder.withMeasure(measure.source.queryName)
                    const selectionId = selectionIdBuilder.createSelectionId()

                    this.categorySelection.push({
                        category: allCategories[categoryIndex],
                        queryName: measure.source.queryName,
                        selection: selectionId,
                    });

                    if (categoryIndex === 1) {
                        const color = this.filterProperty("queryName", measure.source.queryName)[0]
                        const legendItem: LegendDataPoint = {
                            label: measure.source.displayName,
                            color: color.role === "Bars" ? color.barColor : color.lineColor,
                            identity: selectionId,
                            selected: true,
                            markerShape: MarkerShape.circle
                        };
                        legendData.dataPoints.push(legendItem);
                    }
                }
            };

            this.totalBars = this.filterProperty('role', "Bars")
            this.totalLines = this.filterProperty('role', "Lines")
            this.totalTableRows = this.filterProperty('tableSelection', true)

            //Bar Properties
            const barSelectedCategory = String(this.getProperty<string>(selectedSettings, "barData", "categoryProperty", "0"))
            this.barSelectedCategory = Number(barSelectedCategory) > this.totalBars.length ? "0" : barSelectedCategory
            this.barQueryName = this.barSelectedCategory === "0" ? "All" : this.totalBars[Number(this.barSelectedCategory) - 1].queryName

            //Line Properties
            const lineSelectedCategory = String(this.getProperty<string>(selectedSettings, "lineData", "categoryProperty", "0"))
            this.lineSelectedCategory = Number(lineSelectedCategory) > this.totalLines.length ? "0" : lineSelectedCategory
            this.lineQueryName = this.lineSelectedCategory === "0" ? "All" : this.totalLines[Number(this.lineSelectedCategory) - 1].queryName

            //Table Properties
            const tableSelectedCategory = String(this.getProperty<string>(selectedSettings, "tableData", "categoryProperty", "0"))
            this.tableSelectedCategory = Number(tableSelectedCategory) > this.totalBars.length + this.totalLines.length ? "0" : tableSelectedCategory
            this.tableQueryName = this.tableSelectedCategory === "0" ? "All" : this.allProperties[Number(this.tableSelectedCategory) - 1].queryName
            this.tableBorderColor = this.getProperty<string>(selectedSettings, "tableData", "borderColor", "#808080") ===  "#808080" ?  "#808080" : selectedSettings.tableData.borderColor['solid'].color
            this.tableBorderThickness = this.getProperty<number>(selectedSettings, "tableData", "borderThickness", 1)
    
            //Data Label Properties
            this.dataLabelsSeries = this.getProperty<boolean>(selectedSettings, "dataLabels", "series", false)

            //Legend Properties
            this.legendSeries = this.getProperty<boolean>(selectedSettings, "legend", "series", true)
            this.legendPosition = this.getProperty<string>(selectedSettings, "legend", "position", "0")

            //Y Axis
            this.yAxisDisplayUnits = this.getProperty<number>(selectedSettings, "barData", "displayUnitsProperty", 0)

            //Legend Selection        
            if(this.legendSeries){
                this.legend.changeOrientation(Number(this.legendPosition))
                this.legend.drawLegend(legendData, options.viewport);
                const legends = d3.selectAll(".legendItem")
                const legendAttributes = { 'fillOpacity': 1 }
                document.querySelector('div').addEventListener('click', (e) => {
                if (typeof this.selectedDataPoint !== "undefined") {
                    this.handleClick(this.selectedDataPoint.identity, this.selectedDataPoint.label, true)
                    this.resetSelection(legends, legendAttributes)
                    this.previousLegendSelection = ""
                }
            })
            legends.on("click", (e, dataPoint: LegendDataPoint) => {
                this.selectionManager
                    .select(dataPoint.identity)
                    .then((ids) => {
                        this.handleClick(dataPoint.identity, dataPoint.label)
                        if (this.previousLegendSelection !== dataPoint.label) {
                            Array.from(legends).forEach((item: HTMLElement) => {
                                item.querySelector('title').textContent !== dataPoint.label ? item.style.fillOpacity = '0.2' : item.style.fillOpacity = '1'
                            })
                            this.previousLegendSelection = dataPoint.label
                        }
                        else {
                            this.resetSelection(legends, legendAttributes)
                            this.previousLegendSelection = ""
                        }
                    });
                e.stopImmediatePropagation()
            });
            }   
            
            //Property values based on selection
            this.tableFontSize = this.getPropertyValue<number>(this.tableQueryName, this.fontSizeAll, "fontSize")
            this.tableFontFamily = this.getPropertyValue<string>(this.tableQueryName, this.fontFamilyAll, "fontFamily")
            this.tableFontBold = this.getPropertyValue<boolean>(this.tableQueryName, this.fontBoldAll, "fontBold")
            this.tableFontUnderline = this.getPropertyValue<boolean>(this.tableQueryName, this.fontUnderlineAll, "fontUnderline")
            this.tableFontItalic = this.getPropertyValue<boolean>(this.tableQueryName, this.fontItalicAll, "fontItalic")
            this.tableFontColor = this.getPropertyValue<string>(this.tableQueryName, this.fontColorAll, "fontColor")
            this.tableDisplayUnits = this.getPropertyValue<number>(this.tableQueryName, this.displayUnitsPropertyAll, "displayUnitsProperty")
            this.barColor = this.getPropertyValue<string>(this.barQueryName, this.barColors[0], "barColor")
            this.barTransparency = this.getPropertyValue<number>(this.barQueryName, this.barTransparencyAll, "barTransparency")
            this.lineColor = this.getPropertyValue<string>(this.lineQueryName, this.lineColors[0], "lineColor")
            this.lineStyle = this.getPropertyValue<string>(this.lineQueryName, this.lineStyleAll, "lineStyle")
            this.markerSize = this.getPropertyValue<number>(this.lineQueryName, this.markerSizeAll, "markerSize")

            const formatString: string = this.allProperties[0].format
            const dataViewMetadataColumn: powerbi.DataViewMetadataColumn[] = this.allProperties.map(item => {
                return { displayName: item.displayName }
            })

            //YAxis Range
            let maxValue: number = Math.max(...this.allProperties.flatMap(item => item.data));
            const getMin: number = Math.min(...this.allProperties.flatMap(item => item.data));
            let minValue: number = getMin >= 0 ? 0 : getMin - Math.abs(((maxValue - getMin) / axis.getBestNumberOfTicks(getMin, maxValue, dataViewMetadataColumn, 5)))
            maxValue = minValue < 0 && maxValue < 0 ? 0 : maxValue
            const maxFontSize: number= this.totalTableRows.length > 0 ? Math.max(...this.allProperties.filter(item => item.tableSelection).map(item => item.fontSize)) : 10
            const offSet: number = maxFontSize < 12 ? 2 : 1.75

            let width: number = options.viewport.width
            let height: number = options.viewport.height - ((this.totalTableRows.length + 1) * maxFontSize * offSet);
            const widthOffset = 10

            if (width < 125 || height < 125) {
                this.removeElements()
                return
            }
        
            this.target.style.overflow = 'hidden'
            const categoryLength: number = allCategories.length * 60
            if (width < categoryLength) {
                this.target.style.overflow = 'scroll'
                width = categoryLength
            }

            this.svg
                .attr("width", width)
                .attr("height", height - 10)
                .attr("transform", "translate(0, 30)")

            //XAxis
            const xScale = d3.scaleBand()
                .domain(this.allProperties[0].category)
                .range([0, width - (this.margin.left * 2) - widthOffset])

            const yScale = d3.scaleLinear()
                .domain([minValue, maxValue])
                .range([height - this.margin.top * 2, this.margin.top])

            const xAxis = this.xAxis
                .attr("transform", `translate(${this.margin.left * 2}, ${yScale(minValue)})`)
                .call(d3.axisBottom(xScale)
                        .tickFormat(d => {
                            let labelFormat: LabelFormattedTextOptions = {
                                label: d,
                                fontSize: 10,
                                maxWidth: xScale.bandwidth()
                            };
                            return dataLabelUtils.getLabelFormattedText(labelFormat)
                        }))
                .style('display', 'block')
            
            xAxis.selectAll("text")
                 .style('font-Size', '10px')
            xAxis.selectAll(".tick line, path")
                 .remove()
            
            //YAxis
            const yAxis = this.yAxis
                            .call(d3.axisLeft(yScale)
                                    .ticks(axis.getBestNumberOfTicks(minValue, maxValue, dataViewMetadataColumn, 5))
                                    .tickFormat(d => this.formatDataLabelText(this.yAxisDisplayUnits, formatString, Number(d)))
                                    .tickSize(14))
                            .style('display', 'block')
                            .selectAll(".tick line, .domain")
                            .remove()
            
            //Bar Chart
            let currentBarBandwidth: number = 0;
            const padding: number = allCategories.length * 60 > width ? 30 : 20
            const barBandwidth: number = (xScale.bandwidth() - padding) / this.totalBars.length;
            this.filterProperty('role', "Bars").forEach(bar => {
                const data:IDataPoint[] = this.getDataPoints(bar)
                const category = this.filterProperty("queryName", bar.queryName, this.categorySelection)
                this.container
                    .selectAll('bar')
                    .data(data)
                    .enter()
                    .append('rect')
                    .attr("class", bar.displayName)
                    .attr('x', d => {
                        return xScale(d['name']) + currentBarBandwidth + (padding / 2)
                    })
                    .attr('y', d => {
                        const val = d['value']
                        if(val === null){
                            return
                        }
                        return val < 0 ? yScale(0) - this.margin.top : yScale(val) - this.margin.top
                    })
                    .attr('width', d => {
                        if (barBandwidth < 0) {
                            this.removeElements()
                            return 0
                        }
                        return barBandwidth
                    })
                    .attr('height', d => {
                        const h = maxValue + minValue
                        const barHeight = d['value'] < 0 ? yScale(maxValue - Math.abs(d['value'])) : height - yScale(d['value']) - yScale(h)
                        if (barHeight - this.margin.top < 0) {
                            this.removeElements()
                            return
                        } else if (d['value'] === null){
                            return
                        }
                        return barHeight - this.margin.top
                    })
                    .style('fill', bar.barColor)
                    .attr('fill-opacity', (100 - bar.barTransparency) / 100)
                    .on("click", (e, d) => {
                        const categorySelection = category[allCategories.indexOf(d['name'])]
                        this.handleClick(categorySelection.selection, bar.displayName)
                        e.stopImmediatePropagation()
                    })
                    .on("mouseout", () => {
                        this.tooltipService.hide({ isTouchEvent: false, immediately: true });
                    })
                    .on('mouseover', (e, d) => {
                        this.tooltipService.show({
                            dataItems: [
                                { displayName: "Category", value: d['name'] },
                                { displayName: bar.displayName, value: this.formatValue(bar.format, null, d['value'], 2) }
                            ],
                            coordinates: [e.clientX, e.clientY],
                            isTouchEvent: false,
                            identities: bar.selection
                        })
                    })
                    .on('contextmenu', (e, d) => {
                        const categorySelection = category[allCategories.indexOf(d['name'])]
                        this.handleContextMenu(categorySelection.selection)
                    })
                currentBarBandwidth = currentBarBandwidth + barBandwidth
            })

            //Line chart
            const lineBandwidth = (xScale.bandwidth() - padding);
            this.filterProperty('role', "Lines").forEach(line => {
                const data = this.getDataPoints(line)
                const category = this.filterProperty("queryName", line.queryName, this.categorySelection)
                let splitData = [], //Splitting data to handle null values
                currentItem = [] 
                data.forEach( item => {
                    if (item.value === null) {
                    if (currentItem.length > 0) {
                        splitData.push(currentItem);
                    }
                    currentItem = [];
                    } else {
                        currentItem.push(item);
                    }
                })
                if (currentItem.length > 0){
                    splitData.push(currentItem)
                }
    
                splitData.forEach(item => {
                    this.container
                    .datum(item)
                    .append('path')
                    .attr("d", d3.line()
                                .x(d => xScale(d['name']) + (lineBandwidth / 2) + (padding / 2))
                                .y(d => yScale(d['value']) - this.margin.top)
                    )
                    .attr("class", line.displayName)
                    .style('stroke', line.lineColor)
                    .style('stroke-width', '3')
                    .style('fill', 'none')
                    .attr("stroke-dasharray", `10, ${line.lineStyle}`)

                    //Marker
                    this.container
                    .selectAll('marker')
                    .data(item)
                    .enter()
                    .append('circle')
                    .attr("class", line.displayName)
                    .attr('cx', d => {
                        return xScale(d['name']) + (lineBandwidth / 2) + (padding / 2)
                    })
                    .attr('cy', d => {
                        return yScale(d['value']) - this.margin.top
                    })
                    .attr("r", line.markerSize)
                    .style('stroke', line.lineColor)
                    .style('stroke-width', '3')
                    .style('fill', line.lineColor)
                    .on("click", (e, d) => {
                        const categorySelection = category[allCategories.indexOf(d['name'])]
                        this.handleClick(categorySelection.selection, line.displayName)
                        e.stopImmediatePropagation()
                    })
                    .on("mouseout", () => {
                        this.tooltipService.hide({ isTouchEvent: false, immediately: true });
                    })
                    .on('mouseover', (e, d) => {
                        this.tooltipService.show({
                            dataItems: [
                                { displayName: "Category", value: d['name'] },
                                { displayName: line.displayName, value: this.formatValue(line.format, null, d['value'], 2) }
                            ],
                            coordinates: [e.clientX, e.clientY],
                            isTouchEvent: false,
                            identities: line.selection
                        })
                    })
                    .on('contextmenu', (e, d) => {
                        const categorySelection = category[allCategories.indexOf(d['name'])]
                        this.handleContextMenu(categorySelection.selection)
                    })
                })
            })
           
            //Data Labels
            if (this.dataLabelsSeries) {
                currentBarBandwidth = 0;
                const bandwidth: number = this.totalBars.length !== 0 ? barBandwidth : lineBandwidth
                this.allProperties.forEach(label => {
                    const data: IDataPoint[] = this.getDataPoints(label)
                    this.container
                        .selectAll('datalabel')
                        .data(data)
                        .enter()
                        .append('text')
                        .text(d => {
                            if(d['value'] === null){
                                return ""
                            }
                            return this.getAutoNumber(label.format, d['value'])
                        })
                        .attr('y', d => {
                            if(d['value'] === null){
                                return
                            }
                            const val = yScale(d['value']) - this.margin.top
                            return d['value'] < 0 ? val + 20 : val - 5
                        })
                        .attr("stroke", label.role === "Bars" ? label.barColor : label.lineColor)
                        .attr("stroke-width", 0.5)
                        .style("font-size", "10px")
                        .each(function (d) {
                            const textWidth = this.getBBox().width
                            const width = xScale(d['name']) - (textWidth / 2)
                            d3.select(this)
                            .attr("x", label.role === "Bars" ? width + ((padding + bandwidth) / 2) + currentBarBandwidth 
                                                             : width + (padding / 2) + (lineBandwidth / 2))
                            .text(textWidth > bandwidth ? "" : this.textContent)
                        })
                        .attr('class', 'dataLabel')
                    currentBarBandwidth = currentBarBandwidth + bandwidth
                })
            }

            //Table
            if (this.totalTableRows.length > 0) {
                const marginTop: string = '25px'
                const dataTable: HTMLElement = document.createElement('table')
                const dataTableAttributes = {
                    width: `${width - widthOffset}px`,
                    marginTop: marginTop,
                    height: `${options.viewport.height - height - 20}px`
                }

                this.styleElement(dataTable, dataTableAttributes)
                dataTable.setAttribute("class", 'table-data')
                this.filterProperty('tableSelection', true).forEach(selectedText => {
                    const styleAttributes = {
                        fontSize: `${selectedText.fontSize}px`,
                        fontFamily: selectedText.fontFamily,
                        fontWeight: selectedText.fontBold ? 'bold' : 'normal',
                        fontStyle: selectedText.fontItalic ? 'italic' : 'normal',
                        textDecoration: selectedText.fontUnderline ? 'underline' : '',
                        color: selectedText.fontColor
                    }

                    const dataRows: HTMLElement = document.createElement('tr')
                    const dataCol: HTMLElement = document.createElement('td')
                    dataCol.innerText = selectedText.displayName
                    dataCol.style.width = `${this.margin.left * 2}px`
                    this.styleElement(dataCol, styleAttributes)
                    dataCol.setAttribute("class", selectedText.displayName)
                    dataRows.appendChild(dataCol)

                    for (var j = 0; j < allCategories.length; j++) {
                        const dataCol = document.createElement('td')
                        let text = selectedText.data[j]
                        const formattedValue =this.formatDataLabelText(selectedText.displayUnitsProperty, selectedText.format, text)

                        dataCol.innerText = text === null ? "" : formattedValue
                        this.styleElement(dataCol, styleAttributes)
                        dataCol.style.border = `${this.tableBorderThickness / 20}px solid ${this.tableBorderColor}`
                        dataCol.setAttribute("class", selectedText.displayName)

                        const tooltipCategory = this.formatValue(selectedText.format, null, selectedText.category[j], 2)
                        dataCol.addEventListener('mouseover', (e) => {
                            this.tooltipService.show({
                                dataItems: [
                                    { displayName: "Category", value: tooltipCategory },
                                    { displayName: selectedText.displayName, value: formattedValue.toString() }
                                ],
                                coordinates: [e.clientX, e.clientY],
                                isTouchEvent: false,
                                identities: selectedText.selection
                            })
                        })

                        dataCol.addEventListener("mouseout", () => {
                            this.tooltipService.hide({ isTouchEvent: false, immediately: true });
                        })
                        dataRows.appendChild(dataCol)
                    }
                    dataTable.appendChild(dataRows)
                })
                this.tableContainer.appendChild(dataTable)
                this.target.append(this.tableContainer)
            }
            this.persistState();
            this.events.renderingFinished(options);
        }
        catch (e) {
            this.events.renderingFailed(options)
        }
    }

    public removeElements(): void {
        d3.selectAll('rect, table, path, .dataLabel, .legendItem, circle')
            .remove()

        d3.selectAll('.axis')
            .style('display', 'none')
    }

    public getDataPoints(role) {
        return role['category'].map((category, i) => ({
            name: category,
            value: role['data'][i]
        }))
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        const tableDropDownCategories = this.getAllSeries(this.allProperties);
        const barDropDownCategories = this.getAllSeries(this.totalBars);
        const lineDropDownCategories = this.getAllSeries(this.totalLines);

        const tableFormatOptionsSelector = this.tableQueryName !== "All" ? this.tableQueryName : null
        const barFormatOptionsSelector = this.barQueryName !== "All" ? this.barQueryName : null
        const lineFormatOptionsSelector = this.lineQueryName !== "All" ? this.lineQueryName : null

        //Table Properties
        const tableDropdown = this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "category_uid", "Series", "tableData", "categoryProperty", null, this.tableSelectedCategory)
        tableDropdown['control']['properties']['mergeValues'] = tableDropDownCategories as powerbi.IEnumMember[]

        const tableSeries = this.getFormattingSlice(powerbi.visuals.FormattingComponent.ToggleSwitch, "category_series_uid", "Show for this series", "tableData", "showSeries", this.tableQueryName, this.tableSelectedCategory === "0" ? true : this.filterProperty("queryName", this.tableQueryName)[0].tableSelection)
        tableSeries['disabled'] = this.tableSelectedCategory === "0" ? true : false
        let table1_dataFont = this.getFormattingGroup("Apply settings to", "settings_table_group_uid", [tableDropdown, tableSeries])

        const fontProperty = {};
        ['fontFamily', 'fontSize', 'fontBold', 'fontItalic', 'fontUnderline'].forEach(item => {
            fontProperty[item] = this.getFormattingSlice(powerbi.visuals.FormattingComponent.FontControl, "data_font_control_slice_uid", "Font", "tableData", item, tableFormatOptionsSelector, this[`$table{item}`])['control']['properties']['descriptor'] as powerbi.visuals.FormattingDescriptor
        })
        const tableFormattingGroup =
            this.getFormattingGroup("Values", "table_fontProperties_group_uid",
                [this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "table_fontControl_displayUnits_uid", "Display units", "tableData", "displayUnitsProperty", tableFormatOptionsSelector, this.tableDisplayUnits),
                {
                    uid: "data_font_control_slice_uid",
                    displayName: "Font",
                    control: {
                        type: powerbi.visuals.FormattingComponent.FontControl,
                        properties: {
                            fontFamily: {
                                descriptor: fontProperty['fontFamily'],
                                value: this.tableFontFamily
                            },
                            fontSize: {
                                descriptor: fontProperty['fontSize'],
                                options: {
                                    minValue: {
                                        type: powerbi.visuals.ValidatorType.Min,
                                        value: 8,
                                    },
                                    maxValue: {
                                        type: powerbi.visuals.ValidatorType.Min,
                                        value: 100,
                                    }
                                },
                                value: this.tableFontSize
                            },
                            bold: {
                                descriptor: fontProperty['fontBold'],
                                value: this.tableFontBold
                            },
                            italic: {
                                descriptor: fontProperty['fontItalic'],
                                value: this.tableFontItalic
                            },
                            underline: {
                                descriptor: fontProperty['fontUnderline'],
                                value: this.tableFontUnderline
                            }
                        }
                    }
                },
                this.getFormattingSlice(powerbi.visuals.FormattingComponent.ColorPicker, "table_dataDesign_fontColor_slice", "Color", "tableData", "fontColor", tableFormatOptionsSelector, { value: this.tableFontColor })])
        tableFormattingGroup['disabled'] = this.tableSelectedCategory === "0" ? false : !this.filterProperty("queryName", this.tableQueryName)[0].tableSelection
        let table2_dataFont = tableFormattingGroup

        const borderThickness = this.getFormattingSlice(powerbi.visuals.FormattingComponent.Slider, "border_Thickness_uid", "Thickness", "tableData", "borderThickness", null, this.tableBorderThickness)
        const borderThicknessProperties = {
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0,
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 100,
            }
        }
        borderThickness['control']['properties']['options'] = borderThicknessProperties as powerbi.visuals.NumUpDownFormat
        let table3_dataFont = this.getFormattingGroup("Border", "options_table_group_uid", 
                [borderThickness,
                 this.getFormattingSlice(powerbi.visuals.FormattingComponent.ColorPicker, "table_borderColor_slice", "Color", "tableData", "borderColor", null, { value: this.tableBorderColor })])

        //Bar Properties
        const barDropdown = this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "Series_bar_uid", "Series", "barData", "categoryProperty", null, this.barSelectedCategory)
        barDropdown['control']['properties']['mergeValues'] = barDropDownCategories as powerbi.IEnumMember[]
        let bar1_dataFont = this.getFormattingGroup("Apply settings to", "settings_bar_group_uid", [barDropdown])

        const barTransparency = this.getFormattingSlice(powerbi.visuals.FormattingComponent.Slider, "bar_transparency_uid", "Transparency", "barData", "transparency", barFormatOptionsSelector, this.barTransparency)
        const barTransparencyProperties = {
            unitSymbol: "%",
            unitSymbolAfterInput: false,
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0,
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 100,
            }
        }
        barTransparency['control']['properties']['options'] = barTransparencyProperties as powerbi.visuals.NumUpDownFormat
        const barColor = this.getFormattingSlice(powerbi.visuals.FormattingComponent.ColorPicker, "bar_color_uid", "Color", "barData", "fontColor", barFormatOptionsSelector, { value: this.barColor })
        barColor['disabled'] = this.barSelectedCategory === "0" ? true : false
        let bar2_dataFont =
            this.getFormattingGroup("Color", "bar_Properties_group_uid", [barColor, barTransparency])

        //Line Properties
        const lineDropdown = this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "Series_line_uid", "Series", "lineData", "categoryProperty", null, this.lineSelectedCategory)
        lineDropdown['control']['properties']['mergeValues'] = lineDropDownCategories as powerbi.IEnumMember[]
        const lineColor = this.getFormattingSlice(powerbi.visuals.FormattingComponent.ColorPicker, "line_color_uid", "Color", "lineData", "fontColor", lineFormatOptionsSelector, { value: this.lineColor })
        lineColor['disabled'] =  this.lineSelectedCategory === "0" ? true : false
        const lineStyleDropdown = this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "Style_line_uid", "Style", "lineData", "style", lineFormatOptionsSelector, this.lineStyle)
        const markerSize = this.getFormattingSlice(powerbi.visuals.FormattingComponent.NumUpDown, "marker_size_uid", "Marker", "lineData", "marker", lineFormatOptionsSelector, this.markerSize)
        const markerSizeProperties = {
            unitSymbol: "px",
            unitSymbolAfterInput: false,
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0,
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 10,
            }
        }
        markerSize['control']['properties']['options'] = markerSizeProperties as powerbi.visuals.NumUpDownFormat
        let line1_dataFont = this.getFormattingGroup("Apply settings to", "settings_line_group_uid", [lineDropdown])
        let line2_dataFont = this.getFormattingGroup("Line", "line_Properties_group_uid", [lineColor, lineStyleDropdown, markerSize])

        //Legend
        let legend_dataFont = this.getFormattingGroup('Options', 'position_legend_uid', 
                                                     [this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "Legend_uid", "Position", "legend", "position", null, this.legendPosition)])

        //yAxis
        let yaAxis_dataFont = this.getFormattingGroup('Display Units', 'display_units_yAxis', [this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "yAxis_fontControl_displayUnits_uid", "Display units", "barData", "displayUnitsProperty", null, this.yAxisDisplayUnits) ])

        const groups = [
            { role: "yAxis", group: [yaAxis_dataFont], displayName : "Y-Axis"},
            { role: "bar", group: [bar1_dataFont, bar2_dataFont], displayName : "Bar" },
            { role: "line", group: [line1_dataFont, line2_dataFont], displayName : "Line" },
            { role: "table", group: [table1_dataFont, table2_dataFont, table3_dataFont], displayName : "Table" },
            { role: "legend", group : [legend_dataFont], displayName : "Legend" },
            { role: "dataLabels", group: [], displayName : "Data Labels" }
        ]

        const cards = groups.map(item => {
            const card = this.getFormattingCard(`${item.role} Properties`, item.displayName, `${item.role}_uid`, item.group)
            if(item.role === "dataLabels" || item.role === "legend"){
                const slice = this.getFormattingSlice(powerbi.visuals.FormattingComponent.ToggleSwitch, `${item.role}_uid`, item.displayName, item.role, "series", null, this[`${item.role}Series`])
                card['topLevelToggle'] = {
                    suppressDisplayName: true,
                    control: slice['control'] as { type: "ToggleSwitch"; properties: powerbi.visuals.ToggleSwitch },
                    uid: `Series_${item.role}_uid`
                }
            }
            return card
        })

        const formattingModel: powerbi.visuals.FormattingModel = { cards: cards };
        return formattingModel;
    }

    public getFormattingCard(description, displayName, uid, groups): powerbi.visuals.FormattingCard {
        return {
            description: description,
            displayName: displayName,
            uid: uid,
            groups: groups
        }
    }

    public getFormattingGroup(displayName, uid, slices): powerbi.visuals.FormattingGroup {
        return {
            displayName: displayName,
            uid: uid,
            slices: slices
        }
    }


    public getFormattingSlice(type, uid, displayName, objectName, propertyName, selector, value): powerbi.visuals.FormattingSlice {
        return {
            uid: uid,
            displayName: displayName,
            control: {
                type: type,
                properties: {
                    descriptor:
                    {
                        objectName: objectName,
                        propertyName: propertyName,
                        selector: {
                            metadata: selector
                        }
                    },
                    value: value
                }
            }
        }
    }

    private getAllSeries(totalDataPoints): IDropdown[] {
        const dropDownSeries = []
        for (var i = 0; i < totalDataPoints.length + 1; i++) {
            if (i === 0) {
                dropDownSeries.push({
                    "value": "0",
                    "displayName": "All"
                })
            }
            else {
                dropDownSeries.push({
                    "value": String(i),
                    "displayName": totalDataPoints[i - 1].displayName
                })
            }
        }
        return dropDownSeries
    }

    private handleClick(selectionId: ISelectionId, barClass: string, isBodySelected: boolean = false): void {
        this.selectedDataPoint = {
            identity: selectionId,
            label: barClass
        }

        this.selectionManager // Selection Manager for cross filtering and cross highlighting
            .select(selectionId, false)
            .then((ids) => {
                const highlightClass = this.allProperties.filter(item => item.displayName === barClass)
                const otherClasses = this.allProperties.filter(item => item.displayName !== barClass)
                const selectedRow = d3.selectAll(`[class='${barClass}']`)

                //Highlight Bars, Lines and Table   
                if (!isBodySelected) {
                    const highlightAttributes = {
                        fontWeight: "bold",
                        color: highlightClass[0].fontColor,
                        borderColor: 'black',
                        fillOpacity: "1",
                        strokeWidth: '3'
                    }
                    this.resetSelection(selectedRow, highlightAttributes)

                    //Deselect other Bars, Lines and Table
                    otherClasses.forEach(item => {
                        const resetRow = d3.selectAll(`[class='${item.displayName}']`)
                        const resetAttributes = {
                            color: '#D3D3D3',
                            fontWeight: 'normal',
                            fillOpacity: "0.2",
                            strokeWidth: '1'
                        }
                        this.resetSelection(resetRow, resetAttributes)
                    })
                }

                //Reset
                if (this.previousSelection === barClass || isBodySelected) {
                    this.selectionManager
                        .clear()
                        .then(() => {
                            otherClasses.forEach(item => {
                                const resetRow = d3.selectAll(`[class='${item.displayName}']`)
                                const resetAttributes = {
                                    color: item.fontColor,
                                    borderColor: 'black',
                                    fillOpacity: `${(100 - item.barTransparency) / 100}`,
                                    strokeWidth: '3'
                                }
                                this.resetSelection(resetRow, resetAttributes)
                            })

                            const highlightAttributes = {
                                color: highlightClass[0].fontColor,
                                fontWeight: 'normal',
                                fillOpacity: `${(100 - highlightClass[0].barTransparency) / 100}`,
                                strokeWidth: '3' 
                            }
                            this.resetSelection(selectedRow, highlightAttributes)
                        })
                    this.previousSelection = ""
                    return
                }
                this.previousSelection = barClass
            });
    }

    private resetSelection(node, attributes): void {
        Array.from(node).forEach((item: HTMLElement) => {
            this.styleElement(item, attributes)
        })
    }

    private styleElement(element: HTMLElement, styleAttributes): void {
        Object.entries(styleAttributes).forEach(([key, value]) => {
            element.style[key] = value
        })
    }

    private filterProperty(property: string, filterValue, object = this.allProperties) {
        return object.filter(item => item[property] === filterValue)
    }

    private getPropertyValue<T>(queryName: string, value, property: string): T {
        return queryName === "All" ? value : this.filterProperty("queryName", queryName)[0][property]
    }

    private formatValue(formatString, formatValue, value, precision = 0): string {
        const formatter: IValueFormatter = valueFormatter.create({
            format: formatString,
            value: formatValue,
            precision: precision,
            allowFormatBeautification: true
        })
        return formatter.format(value)
    }

    private getAutoNumber(formatString, value): string {
        let formatValue = Math.abs(value)
        switch (true) {
            case (formatValue < 1000):
                return this.formatValue(formatString, 0, value)
            case (formatValue < 1000000):
                return this.formatValue(formatString, 1001, value)
            case (formatValue < 1000000000):
                return this.formatValue(formatString, 1e6, value)
            case (formatValue < 1000000000000):
                return this.formatValue(formatString, 1e9, value)
            case (formatValue < 1000000000000000):
                return this.formatValue(formatString, 1e12, value)
        }
        return this.formatValue(formatString, 0, value)
    }

    public getProperty<T>(objects, object, property, defaultValue): T {
        return typeof objects === "undefined" || typeof objects[object] === "undefined" || typeof objects[object][property] === "undefined" ? defaultValue : <T>objects[object][property]
    }

    private handleContextMenu(selectionID = null) {
        d3.select(this.target).on('contextmenu', (e: PointerEvent) => {
            this.selectionManager.showContextMenu(selectionID, {
                x: e.clientX,
                y: e.clientY
            });
            e.stopImmediatePropagation();
            e.preventDefault();
        });
    }

    private formatDataLabelText(displayUnitsProperty: number, format: string, value: number): string {
        switch (displayUnitsProperty) {
            case 0:
                return this.getAutoNumber(format, value);
            case 1000:
                return this.formatValue(format, 1001, value, 2);
            case 1000000:
                return this.formatValue(format, 1e6, value, 2);
            case 1000000000:
                return this.formatValue(format, 1e9, value, 2);
                break;
            case 1000000000000:
                return this.formatValue(format, 1e12, value, 2);
                break;
            default:
                return this.formatValue(format, null, value, 2);
        }
    }

    private persistState(): void {
      const objects = []
      this.allProperties.forEach(item => {
      const tableProperties = {
            objectName: "tableData",
            selector: item.queryName,
            properties: {
                "fontSize": item.fontSize,
                "fontFamily": item.fontFamily,
                "fontBold": item.fontBold,
                "fontUnderline": item.fontUnderline,
                "fontItalic": item.fontItalic,
                "fontColor": item.fontColor,
                "displayUnitsProperty": item.displayUnitsProperty,
                "showSeries": item.tableSelection
            }
         }
      
      const barProperties = {
            objectName: "barData",
            selector: item.queryName,
            properties: {
            "fontColor": this.barColor,
            "transparency": item.barTransparency
            }
        }

      const lineProperties = {
            objectName: "lineData",
            selector: item.queryName,
            properties: {
            "fontColor": this.lineColor,
            "style": this.lineStyle,
            "marker": this.markerSize
            }
        }
         objects.push(tableProperties)
         objects.push(barProperties)
         objects.push(lineProperties)
       })

       const instances: VisualObjectInstance[] = [
        {   
            objectName: "tableData",
            selector : null,
            properties: {
                "fontSize": this.fontSizeAll,
                "fontFamily": this.fontFamilyAll,
                "fontBold": this.fontBoldAll,
                "fontUnderline": this.fontUnderlineAll,
                "fontItalic": this.fontItalicAll,
                "fontColor": this.fontColorAll,
                "displayUnitsProperty": this.displayUnitsPropertyAll,
                "showSeries": true,
                "borderColor": this.tableBorderColor,
                "borderThickness": this.tableBorderThickness,
            }
        },
        {   
            objectName: "barData",
            selector : null,
            properties: {
                "fontColor": this.barColors[0],
                "transparency": this.barTransparencyAll,
                "displayUnitsProperty": this.yAxisDisplayUnits
            }
        },
        {   
            objectName: "lineData",
            selector : null,
            properties: {
                "fontColor": this.lineColors[0],
                "style": this.lineStyleAll,
                "marker": this.markerSizeAll
            }
        },
        {   
            objectName: "dataLabels",
            selector : null,
            properties: {
                "series": this.dataLabelsSeries
            }
        },
        {   
            objectName: "legend",
            selector : null,
            properties: {
                "series": this.legendSeries,
                "position": this.legendPosition
            }
        }
    ]

    if (JSON.stringify(this.persistedProperties) !== JSON.stringify(instances)) {
        this.visualHost.persistProperties({
            merge: [...instances, ...objects]
        })
        this.persistedProperties = instances; 
    }
    }
}
