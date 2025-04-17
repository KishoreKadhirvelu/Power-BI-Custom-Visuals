"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { legend, legendInterfaces } from 'powerbi-visuals-utils-chartutils';
import "./../style/visual.less";
import { axis, dataLabelUtils } from "powerbi-visuals-utils-chartutils";
import { displayUnitSystem, font, valueFormatter } from "powerbi-visuals-utils-formattingutils";
import { IValueFormatter } from "powerbi-visuals-utils-formattingutils/lib/src/valueFormatter";
import { IDropdown, ICategorySelection, IProperty, IDataPoint } from './interfaces';
import { dataViewWildcard } from "powerbi-visuals-utils-dataviewutils";
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
import DataLabelManager from "powerbi-visuals-utils-chartutils/lib/dataLabel/dataLabelManager";
import { ILabelLayout } from "powerbi-visuals-utils-chartutils/lib/dataLabel/dataLabelInterfaces";
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
    private useConditionalFormatting: boolean
   
    private yAxisDisplayUnits: number
    private yAxisMin: number
    private yAxisMax: number

    private yAxisFontSize: number
    private yAxisFontFamily: string
    private yAxisFontBold: boolean
    private yAxisFontUnderline: boolean
    private yAxisFontItalic: boolean
    private yAxisFontColor: string

    private xAxisFontSize: number
    private xAxisFontFamily: string
    private xAxisFontBold: boolean
    private xAxisFontUnderline: boolean
    private xAxisFontItalic: boolean
    private xAxisFontColor: string

    private lineColor: string
    private lineSelectedCategory: string;
    private lineQueryName: string
    private lineColors: string[] = ["red", "#193be6", "#90EE90", "#ADD8E6", "#D8BFD8", "#F08080", "#AFEEEE", "#FAFAD2", "#D3D3D3", "#FFE4C4"]
    private legendSeries: boolean
    private legendPosition: string
    private lineStyleAll: string
    private lineStyle: string
    private lineSizeAll: number
    private lineSize: number
    private markerSizeAll: number
    private markerSize: number
    private markerShapeAll: string
    private markerShape: string

    private dataLabelFontSize: number
    private dataLabelFontFamily: string
    private dataLabelFontBold: boolean
    private dataLabelFontUnderline: boolean
    private dataLabelFontItalic: boolean
    private dataLabelFontColor: string
    private dataLabelDisplayUnits: number
    private dataLabelSelectedCategory: string;
    private dataLabelQueryName: string

    private dataLabelsSeries: boolean
    private dataLabelFontSizeAll: number
    private dataLabelFontFamilyAll: string
    private dataLabelFontBoldAll: boolean
    private dataLabelFontUnderlineAll: boolean
    private dataLabelFontItalicAll: boolean
    private dataLabelFontColorAll: string
    private dataLabelDisplayUnitsPropertyAll: number

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

            //Table
            this.fontSizeAll = this.getProperty<number>(selectedSettings, "tableData", "fontSize", 10)
            this.fontFamilyAll = this.getProperty<string>(selectedSettings, "tableData", "fontFamily", "wf_standard-font, helvetica, arial, sans-serif")
            this.fontBoldAll = this.getProperty<boolean>(selectedSettings, "tableData", "fontBold", false)
            this.fontUnderlineAll = this.getProperty<boolean>(selectedSettings, "tableData", "fontUnderline", false)
            this.fontItalicAll = this.getProperty<boolean>(selectedSettings, "tableData", "fontItalic", false)
            this.fontColorAll = this.getProperty<string>(selectedSettings, "tableData", "fontColor", "#000000") === "#000000" ? "#000000" : selectedSettings.tableData.fontColor['solid'].color
            this.displayUnitsPropertyAll = this.getProperty<number>(selectedSettings, "tableData", "displayUnitsProperty", 0)
            
            //Bar
            this.barTransparencyAll = this.getProperty<number>(selectedSettings, "barData", "transparency", 0)

           //Line
            this.lineStyleAll = this.getProperty<string>(selectedSettings, "lineData", "style", "0")
            this.markerSizeAll = this.getProperty<number>(selectedSettings, "lineData", "marker", 1)
            this.markerShapeAll = this.getProperty<string>(selectedSettings, "lineData", "markerShape", "0")
            this.lineSizeAll = this.getProperty<number>(selectedSettings, "lineData", "lineSize", 2)

            //Data Labels
            this.dataLabelFontSizeAll = this.getProperty<number>(selectedSettings, "dataLabels", "fontSize", 10)
            this.dataLabelFontFamilyAll = this.getProperty<string>(selectedSettings, "dataLabels", "fontFamily", "wf_standard-font, helvetica, arial, sans-serif")
            this.dataLabelFontBoldAll = this.getProperty<boolean>(selectedSettings, "dataLabels", "fontBold", false)
            this.dataLabelFontUnderlineAll = this.getProperty<boolean>(selectedSettings, "dataLabels", "fontUnderline", false)
            this.dataLabelFontItalicAll = this.getProperty<boolean>(selectedSettings, "dataLabels", "fontItalic", false)
            this.dataLabelFontColorAll = this.getProperty<string>(selectedSettings, "dataLabels", "fontColor", "#000000") === "#000000" ? "#000000" : selectedSettings.dataLabels.fontColor['solid'].color
            this.dataLabelDisplayUnitsPropertyAll = this.getProperty<number>(selectedSettings, "dataLabels", "displayUnitsProperty", 0)

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
                    lineSelection: this.getProperty<boolean>(currentValue,"lineData", "showSeries", true),
                    markerSize: this.getProperty<number>(currentValue,"lineData", "marker", this.markerSizeAll),
                    markerShape: this.getProperty<string>(currentValue,"lineData", "markerShape", this.markerShapeAll),
                    lineSize: this.getProperty<number>(currentValue,"lineData", "lineSize", this.lineSizeAll),
                    tableSelection: this.getProperty<boolean>(currentValue,"tableData", "showSeries", true),
                    dataLabelFontSize : this.getProperty<number>(currentValue,"dataLabels", "fontSize", this.dataLabelFontSizeAll),
                    dataLabelFontFamily : this.getProperty<string>(currentValue,"dataLabels", "fontFamily", this.dataLabelFontFamilyAll),
                    dataLabelFontBold : this.getProperty<boolean>(currentValue,"dataLabels", "fontBold", this.dataLabelFontBoldAll),
                    dataLabelFontUnderline : this.getProperty<boolean>(currentValue,"dataLabels", "fontUnderline", this.dataLabelFontUnderlineAll),
                    dataLabelFontItalic : this.getProperty<boolean>(currentValue,"dataLabels", "fontItalic", this.dataLabelFontItalicAll),
                    dataLabelFontColor : this.getProperty<string>(currentValue,"dataLabels", "fontColor", this.dataLabelFontColorAll) === this.dataLabelFontColorAll ? this.dataLabelFontColorAll : currentValue.dataLabels.fontColor['solid'].color,
                    dataLabelDisplayUnitsProperty : this.getProperty<number>(currentValue,"dataLabels", "displayUnitsProperty", this.dataLabelDisplayUnitsPropertyAll),
                    dataLabelSelection: this.getProperty<boolean>(currentValue,"dataLabels", "showSeries", true),
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
                        if(color.lineSelection){
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
                }
            };

            this.totalBars = this.filterProperty('role', "Bars")
            this.totalLines = this.filterProperty('role', "Lines")
            this.totalTableRows = this.filterProperty('tableSelection', true)

            //console.log(options.dataViews[0])

            //Bar Properties
            const barSelectedCategory = String(this.getProperty<string>(selectedSettings, "barData", "categoryProperty", "0"))
            this.barSelectedCategory = Number(barSelectedCategory) > this.totalBars.length ? "0" : barSelectedCategory
            this.barQueryName = this.barSelectedCategory === "0" ? "All" : this.totalBars[Number(this.barSelectedCategory) - 1].queryName
            this.useConditionalFormatting = this.totalBars.length > 1 ? false : this.getProperty<boolean>(selectedSettings, "barData", "useConditionalFormatting", false)

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
            //this.dataLabelsSeries = this.getProperty<boolean>(selectedSettings, "dataLabels", "series", false)
            const dataLabelSelectedCategory = String(this.getProperty<string>(selectedSettings, "dataLabels", "categoryProperty", "0"))
            this.dataLabelSelectedCategory = Number(dataLabelSelectedCategory) > this.totalBars.length + this.totalLines.length ? "0" : dataLabelSelectedCategory
            this.dataLabelQueryName = this.dataLabelSelectedCategory === "0" ? "All" : this.allProperties[Number(this.dataLabelSelectedCategory) - 1].queryName

            //Legend Properties
            this.legendSeries = this.getProperty<boolean>(selectedSettings, "legend", "series", true)
            this.legendPosition = this.getProperty<string>(selectedSettings, "legend", "position", "0")

            //Y-Axis
            this.yAxisMin = this.getProperty<number>(selectedSettings, "barData", "yAxisMin", null)
            this.yAxisMax = this.getProperty<number>(selectedSettings, "barData", "yAxisMax", null)

            this.yAxisFontSize = this.getProperty<number>(selectedSettings, "yAxis", "fontSize", 10)
            this.yAxisFontFamily = this.getProperty<string>(selectedSettings, "yAxis", "fontFamily", "wf_standard-font, helvetica, arial, sans-serif")
            this.yAxisFontBold = this.getProperty<boolean>(selectedSettings, "yAxis", "fontBold", false)
            this.yAxisFontUnderline = this.getProperty<boolean>(selectedSettings, "yAxis", "fontUnderline", false)
            this.yAxisFontItalic = this.getProperty<boolean>(selectedSettings, "yAxis", "fontItalic", false)
            this.yAxisFontColor = this.getProperty<string>(selectedSettings, "yAxis", "fontColor", "#000000") === "#000000" ? "#000000" : selectedSettings.yAxis.fontColor['solid'].color
            this.yAxisDisplayUnits = this.getProperty<number>(selectedSettings, "yAxis", "displayUnitsProperty", 0)

            //X-Axis
            this.xAxisFontSize = this.getProperty<number>(selectedSettings, "xAxis", "fontSize", 10)
            this.xAxisFontFamily = this.getProperty<string>(selectedSettings, "xAxis", "fontFamily", "wf_standard-font, helvetica, arial, sans-serif")
            this.xAxisFontBold = this.getProperty<boolean>(selectedSettings, "xAxis", "fontBold", false)
            this.xAxisFontUnderline = this.getProperty<boolean>(selectedSettings, "xAxis", "fontUnderline", false)
            this.xAxisFontItalic = this.getProperty<boolean>(selectedSettings, "xAxis", "fontItalic", false)
            this.xAxisFontColor = this.getProperty<string>(selectedSettings, "xAxis", "fontColor", "#000000") === "#000000" ? "#000000" : selectedSettings.xAxis.fontColor['solid'].color

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
            this.lineSize = this.getPropertyValue<number>(this.lineQueryName, this.lineSizeAll, "lineSize")
            this.lineStyle = this.getPropertyValue<string>(this.lineQueryName, this.lineStyleAll, "lineStyle")
            this.markerSize = this.getPropertyValue<number>(this.lineQueryName, this.markerSizeAll, "markerSize")
            this.markerShape = this.getPropertyValue<string>(this.lineQueryName, this.markerShapeAll, "markerShape")

            this.dataLabelFontSize = this.getPropertyValue<number>(this.dataLabelQueryName, this.dataLabelFontSizeAll, "dataLabelFontSize")
            this.dataLabelFontFamily = this.getPropertyValue<string>(this.dataLabelQueryName, this.dataLabelFontFamilyAll, "dataLabelFontFamily")
            this.dataLabelFontBold = this.getPropertyValue<boolean>(this.dataLabelQueryName, this.dataLabelFontBoldAll, "dataLabelFontBold")
            this.dataLabelFontUnderline = this.getPropertyValue<boolean>(this.dataLabelQueryName, this.dataLabelFontUnderlineAll, "dataLabelFontUnderline")
            this.dataLabelFontItalic = this.getPropertyValue<boolean>(this.dataLabelQueryName, this.dataLabelFontItalicAll, "dataLabelFontItalic")
            this.dataLabelFontColor = this.getPropertyValue<string>(this.dataLabelQueryName, this.dataLabelFontColorAll, "dataLabelFontColor")
            this.dataLabelDisplayUnits = this.getPropertyValue<number>(this.dataLabelQueryName, this.dataLabelDisplayUnitsPropertyAll, "dataLabelDisplayUnitsProperty")
            this.dataLabelsSeries = this.getProperty<boolean>(selectedSettings, "dataLabels", "series", false)

            const formatString: string = this.allProperties[0].format
            const dataViewMetadataColumn: powerbi.DataViewMetadataColumn[] = this.allProperties.map(item => {
                return { displayName: item.displayName }
            })
            
            //YAxis Range
            let maxValue: number = Math.max(...this.getMinMaxValue());
            const getMin: number = Math.min(...this.allProperties.filter(item => item.lineSelection || item.role === "Bars").flatMap(item => item.data).filter(item => item !== null));
            var adjustedHeight = 0;
            let minValue: number;
            let barRules = options.dataViews[0].categorical.categories[0].objects;

            if(typeof(barRules) !== "undefined"){
                this.yAxisMin = Object.hasOwn(barRules[0]["barData"], "yAxisMin") ? <number>barRules[0]["barData"]["yAxisMin"] : this.yAxisMin
                this.yAxisMax = Object.hasOwn(barRules[0]["barData"], "yAxisMax") ? <number>barRules[0]["barData"]["yAxisMax"] : this.yAxisMax
            }

            if (getMin === Infinity || getMin === -Infinity) {
                this.removeElements()
                return
            }

            if(this.yAxisMin === null){
                minValue = getMin >= 0 ? 0 : getMin - Math.abs(((maxValue - getMin) / axis.getBestNumberOfTicks(getMin, maxValue, dataViewMetadataColumn, 5)));
            }
            else{
                if(this.yAxisMin <= getMin){
                    minValue =  this.yAxisMin
                    if(getMin >= 0){
                        adjustedHeight = this.yAxisMin
                    }
                }
                else{
                    minValue = getMin
                    if(getMin >= 0){
                        adjustedHeight = getMin
                    }
                }  
            }
            
            if(this.yAxisMax === null){
                maxValue = minValue < 0 && maxValue < 0 ? 0 : maxValue
            }
            else{
                if(this.yAxisMax <= minValue){
                    maxValue = minValue < 0 && maxValue < 0 ? 0 : maxValue
                }
                else{
                    maxValue = this.yAxisMax;
                }
            }

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
                .style('font-Size', this.xAxisFontSize)
                .style('Color', this.xAxisFontColor)
                .style('font-Family', this.xAxisFontFamily)
                .style('font-Weight', this.xAxisFontBold ? 'bold' : 'normal')
                .style('font-Style', this.xAxisFontItalic ? 'italic' : 'normal')      

            xAxis.selectAll("text")
                 .style('text-decoration', this.xAxisFontUnderline ? 'underline' : '') 
            
            xAxis.selectAll(".tick line, path")
                 .remove()
            
            //YAxis
            const yAxis = this.yAxis
                            .call(d3.axisLeft(yScale)
                                    .ticks(axis.getBestNumberOfTicks(minValue, maxValue, dataViewMetadataColumn, 5))
                                    .tickFormat(d => this.formatDataLabelText(this.yAxisDisplayUnits, formatString, Number(d)))
                                    .tickSize(14))
                            .style('display', 'block')
                            .style('font-Size', this.yAxisFontSize)
                            .style('Color', this.yAxisFontColor)
                            .style('font-Family', this.yAxisFontFamily)
                            .style('font-Weight', this.yAxisFontBold ? 'bold' : 'normal')
                            .style('font-Style', this.yAxisFontItalic ? 'italic' : 'normal')      

            yAxis.selectAll("text")
                 .style('text-decoration', this.yAxisFontUnderline ? 'underline' : '') 
            yAxis.selectAll(".tick line, .domain")
                 .remove()
        
            //Bar Chart
            let currentBarBandwidth: number = 0;
            const padding: number = allCategories.length * 60 > width ? 30 : 20
            const barBandwidth: number = (xScale.bandwidth() - padding) / this.totalBars.length;
            
            const linearGradient = options.dataViews[0].metadata["objectsRules"];
            let barRulesColor = this.getRules(barRules); 

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
                        const h = maxValue + minValue - adjustedHeight
                        const barHeight = d['value'] < 0 ? yScale(maxValue - Math.abs(d['value'])) : height - yScale(d['value']) - yScale(h)
                        if (barHeight - this.margin.top < 0) {
                            this.removeElements()
                            return
                        } else if (d['value'] === null){
                            return
                        }
                        return barHeight - this.margin.top
                    })
                    .style('fill', (d, i) => {
                        if(this.totalBars.length <= 1 && this.useConditionalFormatting){ 
                            if(typeof(linearGradient) !== "undefined" && typeof(linearGradient["barData"]) !== "undefined"){
                                return this.getGradientColor(linearGradient["barData"], d['value'], minValue, maxValue)
                            }
                            else if(typeof(barRules) !== "undefined" ) {
                                if(barRules[i] === null || Object.hasOwn(barRules[i]["barData"], "fontColor")){
                                    return barRulesColor[i]
                                }
                                else{
                                    return "#000000"
                                }
                            }
                        }
                        return bar.barColor
                    })
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
                if(line.lineSelection){
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
                        .style('stroke-width', line.lineSize)
                        .style('fill', 'none')
                        .attr("stroke-dasharray", `10, ${line.lineStyle}`)

                        //Marker
                        const adjustedSize = String(line.markerShape) === "6" ? 1.5 : 1
                        this.container
                        .selectAll('marker')
                        .data(item)
                        .enter()
                        .append('text')
                        .classed(line.displayName, true)
                        .classed("marker", true)
                        .attr('x', d => {
                            return xScale(d['name']) + (lineBandwidth / 2) + (padding / 2) - (line.markerSize * adjustedSize)
                        })
                        .attr('y', d => {
                            return yScale(d['value']) - this.margin.top + line.markerSize
                        })
                        .text(this.getMarkerShape(String(line.markerShape)))
                       // .attr("r", line.markerSize)
                        .style('stroke', line.lineColor)
                        .style('font-Size', line.markerSize * 3)
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
                }
            })
                    
            //Data Labels
            if (this.dataLabelsSeries) {
                currentBarBandwidth = 0;
                const bandwidth: number = this.totalBars.length !== 0 ? barBandwidth : lineBandwidth
                this.allProperties.forEach(label => {
                    if(label.lineSelection){
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
                                return this.formatDataLabelText(label.dataLabelDisplayUnitsProperty, label.format, d['value'])
                            })
                            .attr('y', d => {
                                if(d['value'] === null){
                                    return
                                }
                                const val = yScale(d['value']) - this.margin.top
                                return d['value'] < 0 ? val + 20 : val - 5
                            })
                            .attr("stroke", label.dataLabelFontColor)
                            .attr("stroke-width", label.dataLabelSelection ? 0.5 : 0)
                            .style("font-size", label.dataLabelSelection ? label.dataLabelFontSize : 0 + "px")
                            .style('Color', label.dataLabelFontColor)
                            .style('font-Family', label.dataLabelFontFamily)
                            .style('font-Weight', label.dataLabelFontBold ? 'bold' : 'normal')
                            .style('font-Style', label.dataLabelFontItalic ? 'italic' : 'normal')      
                            .style('text-decoration', label.dataLabelFontUnderline ? 'underline' : '') 
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
                        }
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
                        const formattedValue = this.formatDataLabelText(selectedText.displayUnitsProperty, selectedText.format, text)

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
        d3.selectAll('rect, table, path, .dataLabel, .legendItem, .marker, linearGradient')
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
        const dataLabelDropDownCategories = this.getAllSeries(this.allProperties);
        const barDropDownCategories = this.getAllSeries(this.totalBars);
        const lineDropDownCategories = this.getAllSeries(this.totalLines);

        const tableFormatOptionsSelector = this.tableQueryName !== "All" ? this.tableQueryName : null
        const barFormatOptionsSelector = this.barQueryName !== "All" ? this.barQueryName : null
        const lineFormatOptionsSelector = this.lineQueryName !== "All" ? this.lineQueryName : null
        const dataLabelFormatOptionsSelector = this.dataLabelQueryName !== "All" ? this.dataLabelQueryName : null

        //Table Properties
        const tableDropdown = this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "category_uid", "Series", "tableData", "categoryProperty", null, this.tableSelectedCategory)
        tableDropdown['control']['properties']['mergeValues'] = tableDropDownCategories as powerbi.IEnumMember[]

        const tableSeries = this.getFormattingSlice(powerbi.visuals.FormattingComponent.ToggleSwitch, "category_series_uid", "Show for this series", "tableData", "showSeries", this.tableQueryName, this.tableSelectedCategory === "0" ? true : this.filterProperty("queryName", this.tableQueryName)[0].tableSelection)
        tableSeries['disabled'] = this.tableSelectedCategory === "0" ? true : false
        let table1_dataFont = this.getFormattingGroup("Apply settings to", "settings_table_group_uid", [tableDropdown, tableSeries])

        const fontProperties = ['fontFamily', 'fontSize', 'fontBold', 'fontItalic', 'fontUnderline'];
        const tableFontProperty = this.fontProperties(fontProperties, tableFormatOptionsSelector, "tableData", "table");

        let table2_dataFont =
            this.getFormattingGroup("Values", "table_fontProperties_group_uid",
                [this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "table_fontControl_displayUnits_uid", "Display units", "tableData", "displayUnitsProperty", tableFormatOptionsSelector, this.tableDisplayUnits),
                 this.fontSlice(tableFontProperty, "table"),
                 this.getFormattingSlice(powerbi.visuals.FormattingComponent.ColorPicker, "table_dataDesign_fontColor_slice", "Color", "tableData", "fontColor", tableFormatOptionsSelector, { value: this.tableFontColor })])
        table2_dataFont['disabled'] = this.tableSelectedCategory === "0" ? false : !this.filterProperty("queryName", this.tableQueryName)[0].tableSelection

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

        const barColor = this.getFormattingSlice(powerbi.visuals.FormattingComponent.ColorPicker, "bar_color_uid", "Color", "barData", "fontColor", barFormatOptionsSelector, { value: this.barColor })
        this.barSelectedCategory === "0" ? barColor['control']['properties']['descriptor'] = this.addConditionalFormattingOptions(barColor) : null
        
        const barConditionalFormat = 
        this.getFormattingSlice(powerbi.visuals.FormattingComponent.ToggleSwitch, "bar_color_CF_series_uid", "Use conditional formatting", "barData", "useConditionalFormatting", null, this.useConditionalFormatting)
        
        if(this.totalBars.length > 1){
            barConditionalFormat["disabled"] = true;
        }

        if(!this.useConditionalFormatting){
            if(this.barSelectedCategory === "0"){
                barColor['disabled'] = true
            }
            else{
                barColor['disabled'] = false
            }
        }
        else{
            if(this.barSelectedCategory === "0"){
                barColor['disabled'] = false
            }
            else{
                barColor['disabled'] = true
            }
        }
        
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

        let bar2_dataFont = this.getFormattingGroup("Color", "bar_Properties_group_uid", [barColor, barConditionalFormat, barTransparency])

        //Line Properties
        const lineDropdown = this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "Series_line_uid", "Series", "lineData", "categoryProperty", null, this.lineSelectedCategory)
        lineDropdown['control']['properties']['mergeValues'] = lineDropDownCategories as powerbi.IEnumMember[]

        const lineSeries = this.getFormattingSlice(powerbi.visuals.FormattingComponent.ToggleSwitch, "line_series_uid", "Show for this series", "lineData", "showSeries", this.lineQueryName, this.lineSelectedCategory === "0" ? true : this.filterProperty("queryName", this.lineQueryName)[0].lineSelection)
        lineSeries['disabled'] = this.lineSelectedCategory === "0" ? true : false

        const lineColor = this.getFormattingSlice(powerbi.visuals.FormattingComponent.ColorPicker, "line_color_uid", "", "lineData", "fontColor", lineFormatOptionsSelector, { value: this.lineColor })
        lineColor['disabled'] =  this.lineSelectedCategory === "0" ? true : false
        
        const lineSize = this.getFormattingSlice(powerbi.visuals.FormattingComponent.NumUpDown, "line_size_uid", "Width", "lineData", "lineSize", lineFormatOptionsSelector, this.lineSize)
        const lineSizeProperties = {
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
        lineSize['control']['properties']['options'] = lineSizeProperties as powerbi.visuals.NumUpDownFormat

        const lineStyleDropdown = this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "Style_line_uid", "Style", "lineData", "style", lineFormatOptionsSelector, this.lineStyle)
        
        //Marker
        const markerSize = this.getFormattingSlice(powerbi.visuals.FormattingComponent.NumUpDown, "marker_size_uid", "Size", "lineData", "marker", lineFormatOptionsSelector, this.markerSize)
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

        const markerShape = this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "marker_shape_uid", "Shape", "lineData", "markerShape", lineFormatOptionsSelector, this.markerShape)

        let line1_dataFont = this.getFormattingGroup("Apply settings to", "settings_line_group_uid", [lineDropdown, lineSeries])
        let line4_dataFont = this.getFormattingGroup("Color", "Color_Properties_group_uid", [lineColor])
        let line2_dataFont = this.getFormattingGroup("Line", "line_Properties_group_uid", [lineSize, lineStyleDropdown])
        let line3_dataFont = this.getFormattingGroup("Marker", "marker_Properties_group_uid", [markerSize, markerShape])
        line2_dataFont['disabled'] = this.lineSelectedCategory === "0" ? false : !this.filterProperty("queryName", this.lineQueryName)[0].lineSelection
        line3_dataFont['disabled'] = this.lineSelectedCategory === "0" ? false : !this.filterProperty("queryName", this.lineQueryName)[0].lineSelection

        //Legend
        let legend_dataFont = this.getFormattingGroup('Options', 'position_legend_uid', [this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "Legend_uid", "Position", "legend", "position", null, this.legendPosition)])

        //Y-Axis
        let yAxisMinSlice = this.getFormattingSlice(powerbi.visuals.FormattingComponent.NumUpDown, "yAxis_min_range_uid", "Minimum", "barData", "yAxisMin", null, this.yAxisMin);
        yAxisMinSlice['control']['properties']['descriptor'] = this.addConditionalFormattingOptions(yAxisMinSlice)
        yAxisMinSlice['control']['properties']['placeholderText'] = 'Auto'  
        
        let yAxisMaxSlice = this.getFormattingSlice(powerbi.visuals.FormattingComponent.NumUpDown, "yAxis_max_range_uid", "Maximum", "barData", "yAxisMax", null, this.yAxisMax);
        yAxisMaxSlice['control']['properties']['descriptor'] = this.addConditionalFormattingOptions(yAxisMaxSlice)
        yAxisMaxSlice['control']['properties']['placeholderText'] = 'Auto'
        
        const yAxisFontProperty = this.fontProperties(fontProperties, null, "yAxis", "yAxis");

        let yAxis_dataFont = 
        this.getFormattingGroup('Values', 'display_units_yAxis', 
            [this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "yAxis_fontControl_displayUnits_uid", "Display units", "yAxis", "displayUnitsProperty", null, this.yAxisDisplayUnits),
             this.fontSlice(yAxisFontProperty, "yAxis"), 
             this.getFormattingSlice(powerbi.visuals.FormattingComponent.ColorPicker, "yAxis_dataDesign_fontColor_slice", "Color", "yAxis", "fontColor", null, { value: this.yAxisFontColor })
            ])

        let yAxis_range = this.getFormattingGroup('Range', 'range_yAxis_min', [yAxisMinSlice, yAxisMaxSlice])

        //X-Axis
        const xAxisFontProperty = this.fontProperties(fontProperties, null, "xAxis", "xAxis");
        let xAxis_dataFont = 
        this.getFormattingGroup('Values', 'xAxis_font', 
            [this.fontSlice(xAxisFontProperty, "xAxis"), 
             this.getFormattingSlice(powerbi.visuals.FormattingComponent.ColorPicker, "xAxis_dataDesign_fontColor_slice", "Color", "xAxis", "fontColor", null, { value: this.xAxisFontColor })
            ])

        //Data Label Properties
        const dataLabelDropdown = this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "dataLabel_category_uid", "Series", "dataLabels", "categoryProperty", null, this.dataLabelSelectedCategory)
        dataLabelDropdown['control']['properties']['mergeValues'] = dataLabelDropDownCategories as powerbi.IEnumMember[]

        const dataLabelSeries = this.getFormattingSlice(powerbi.visuals.FormattingComponent.ToggleSwitch, "dataLabel_category_series_uid", "Show for this series", "dataLabels", "showSeries", this.dataLabelQueryName, this.dataLabelSelectedCategory === "0" ? true : this.filterProperty("queryName", this.dataLabelQueryName)[0].dataLabelSelection)
        dataLabelSeries['disabled'] = this.dataLabelSelectedCategory === "0" ? true : false
        let dataLabel1_dataFont = this.getFormattingGroup("Apply settings to", "dataLabel_settings_table_group_uid", [dataLabelDropdown, dataLabelSeries])

        const dataLabelFontProperty = this.fontProperties(fontProperties, dataLabelFormatOptionsSelector, "dataLabels", "dataLabel");
        let dataLabel2_dataFont =
            this.getFormattingGroup("Values", "dataLabel_fontProperties_group_uid",
                [this.getFormattingSlice(powerbi.visuals.FormattingComponent.Dropdown, "dataLabel_fontControl_displayUnits_uid", "Display units", "dataLabels", "displayUnitsProperty", dataLabelFormatOptionsSelector, this.dataLabelDisplayUnits),
                 this.fontSlice(dataLabelFontProperty, "dataLabel"),
                 this.getFormattingSlice(powerbi.visuals.FormattingComponent.ColorPicker, "dataLabel_dataDesign_fontColor_slice", "Color", "dataLabels", "fontColor", dataLabelFormatOptionsSelector, { value: this.dataLabelFontColor })])
        dataLabel2_dataFont['disabled'] = this.dataLabelSelectedCategory === "0" ? false : !this.filterProperty("queryName", this.dataLabelQueryName)[0].dataLabelSelection
        
        const groups = [
            { role: "yAxis", group: [yAxis_range, yAxis_dataFont], displayName : "Y-Axis"},
            { role: "xAxis", group: [xAxis_dataFont], displayName : "X-Axis"},
            { role: "bar", group: [bar1_dataFont, bar2_dataFont], displayName : "Bar" },
            { role: "line", group: [line1_dataFont, line4_dataFont, line2_dataFont, line3_dataFont], displayName : "Line & Marker" },
            { role: "table", group: [table1_dataFont, table2_dataFont, table3_dataFont], displayName : "Table" },
            { role: "legend", group : [legend_dataFont], displayName : "Legend" },
            { role: "dataLabels", group: [dataLabel1_dataFont, dataLabel2_dataFont], displayName : "Data Labels" }
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

    private fontProperties(fontProperties, selector, object, property) {
        const fontProperty = {};
        fontProperties.forEach(item => {
            fontProperty[item] = this.getFormattingSlice(powerbi.visuals.FormattingComponent.FontControl, `${property}_font_control_slice_uid`, "Font", object, item, selector, this[`${property}${item}`])['control']['properties']['descriptor'] as powerbi.visuals.FormattingDescriptor
        })

        return fontProperty
    }

    private addConditionalFormattingOptions(formattingOptions: powerbi.visuals.FormattingSlice){
        const options = formattingOptions['control']['properties']['descriptor']

        options['selector'] = dataViewWildcard.createDataViewWildcardSelector(dataViewWildcard.DataViewWildcardMatchingOption.InstancesOnly),
        options['altConstantValueSelector'] = null,
        options['instanceKind'] = powerbi.VisualEnumerationInstanceKinds.ConstantOrRule 

        return options
    }

    private getMinMaxValue(){
        return this.allProperties.filter(item => item.lineSelection || item.role === "Bars").flatMap(item => item.data).filter(item => item !== null)
    }

    private getGradientColor(linearGradient, value: number, minValue, maxValue): string{
        const linearGradientMinData = linearGradient["fontColor"]["gradient"]["options"]["linearGradient2"]["min"]
        const linearGradientMaxData = linearGradient["fontColor"]["gradient"]["options"]["linearGradient2"]["max"]
        const nullColoringStrategy = linearGradient["fontColor"]["gradient"]["options"]["linearGradient2"]["nullColoringStrategy"]

        //const numerator = value - linearGradientMinValue
        //const denominator = linearGradientMaxValue === linearGradientMinValue ? numerator : linearGradientMaxValue - linearGradientMinValue

        const linearGradientMinValue = linearGradientMinData["value"] === null ? minValue : linearGradientMinData["value"]
        const linearGradientMaxValue = linearGradientMaxData["value"] === null ? maxValue : linearGradientMaxData["value"]

        const gradientScale = d3.scaleLinear()
                .domain([linearGradientMinValue, linearGradientMaxValue])
                .range([0, 1])

        if(value === null && nullColoringStrategy["strategy"] === "specificColor"){
            return nullColoringStrategy["color"]
        }

        return d3.interpolateRgb(linearGradientMinData["color"],  linearGradientMaxData["color"])(gradientScale(value));
    }

    private getRules(rules: powerbi.DataViewObjects[]):string[] {
        let rulesColor = []
        if(typeof(rules) !== "undefined"){
            rules.forEach((rule, i) => {
                if(rule === null || typeof(rule["barData"]["fontColor"]) === "undefined"){
                    rulesColor.push("#000000")
                }
                else if(typeof(rule["barData"]["fontColor"]) !== "undefined"){
                    rulesColor.push(rule["barData"]["fontColor"]["solid"]["color"]);    
                }
            })
        }
        return rulesColor
    }

    private fontSlice(fontProperty, property) {
        return {
            uid: `${property}_data_font_control_slice_uid`,
            displayName: "Font",
            control: {
                type: powerbi.visuals.FormattingComponent.FontControl,
                properties: {
                    fontFamily: {
                        descriptor: fontProperty['fontFamily'],
                        value: this[`${property}FontFamily`]
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
                        value: this[`${property}FontSize`]
                    },
                    bold: {
                        descriptor: fontProperty['fontBold'],
                        value: this[`${property}FontBold`]
                    },
                    italic: {
                        descriptor: fontProperty['fontItalic'],
                        value: this[`${property}FontItalic`]
                    },
                    underline: {
                        descriptor: fontProperty['fontUnderline'],
                        value: this[`${property}FontUnderline`]
                    }
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

    private getMarkerShape(selectedShape: string): string {
         switch (selectedShape){
            case "0":
                return "●"
            case "1":
                return "■"
            case "2":
                 return "▲"
            case "3":
                return "♦"
            case "4":
                return "X"
            case "5":
                return "+"
            case "6":
                return "—"
         }
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
            "lineSize": this.lineSize,
            "style": this.lineStyle,
            "marker": this.markerSize,
            "showSeries": item.lineSelection
            }
        }

    const dataLabelProperties = {
            objectName: "dataLabels",
            selector: item.queryName,
            properties: {
                "fontSize": item.dataLabelFontSize,
                "fontFamily": item.dataLabelFontFamily,
                "fontBold": item.dataLabelFontBold,
                "fontUnderline": item.dataLabelFontUnderline,
                "fontItalic": item.dataLabelFontItalic,
                "fontColor": item.dataLabelFontColor,
                "displayUnitsProperty": item.dataLabelDisplayUnitsProperty,
                "showSeries": item.dataLabelSelection
            }
         }
         objects.push(tableProperties)
         objects.push(barProperties)
         objects.push(lineProperties)
         objects.push(dataLabelProperties)
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
                "yAxisMin": this.yAxisMin,
                "yAxisMax": this.yAxisMax,
                "yAxisFontSize": this.yAxisFontSize,
                "yAxisFontFamily": this.yAxisFontFamily,
                "yAxisFontBold": this.yAxisFontBold,
                "yAxisFontUnderline": this.yAxisFontUnderline,
                "yAxisFontItalic": this.yAxisFontItalic,
                "yAxisFontColor": this.yAxisFontColor,
                "displayUnitsProperty": this.yAxisDisplayUnits,
                "useConditionalFormatting": this.useConditionalFormatting
            }
        },
        {   
            objectName: "yAxis",
            selector : null,
            properties: {
                "fontSize": this.yAxisFontSize,
                "fontFamily": this.yAxisFontFamily,
                "fontBold": this.yAxisFontBold,
                "fontUnderline": this.yAxisFontUnderline,
                "fontItalic": this.yAxisFontItalic,
                "fontColor": this.yAxisFontColor,
                "displayUnitsProperty": this.yAxisDisplayUnits
            }
        },
        {   
            objectName: "xAxis",
            selector : null,
            properties: {
                "fontSize": this.xAxisFontSize,
                "fontFamily": this.xAxisFontFamily,
                "fontBold": this.xAxisFontBold,
                "fontUnderline": this.xAxisFontUnderline,
                "fontItalic": this.xAxisFontItalic,
                "fontColor": this.xAxisFontColor
            }
        },
        {   
            objectName: "lineData",
            selector : null,
            properties: {
                "fontColor": this.lineColors[0],
                "lineSize": this.lineSizeAll,
                "style": this.lineStyleAll,
                "marker": this.markerSizeAll,
                "markerShape": this.markerShapeAll,
                "showSeries": true
            }
        },
        {   
            objectName: "dataLabels",
            selector : null,
            properties: {
                "fontSize": this.dataLabelFontSizeAll,
                "fontFamily": this.dataLabelFontFamilyAll,
                "fontBold": this.dataLabelFontBoldAll,
                "fontUnderline": this.dataLabelFontUnderlineAll,
                "fontItalic": this.dataLabelFontItalicAll,
                "fontColor": this.dataLabelFontColorAll,
                "displayUnitsProperty": this.dataLabelDisplayUnitsPropertyAll,
                "showSeries": false,
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
