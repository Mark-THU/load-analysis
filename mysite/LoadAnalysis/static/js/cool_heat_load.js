const day_chara_names = ['日最大负荷', '日最小负荷', '日平均负荷', '日负荷率', '日最小负荷率', '日峰谷差', '日峰谷差率'];
const day_chara_desc = ['每日最大负荷', '每日最小负荷', '每日平均负荷', '日平均负荷/日最大负荷', '日最小负荷/日最大负荷',
    '日最大负荷-日最小负荷', '（日最大负荷-日最小负荷）/日最大负荷'];
let all_data;
let time = [];
for (let i = 0; i < 24; i++) {
    time.push(i);
}
$(document).ready(function () {
    // 表格初始显示
    drawCoolDataTable();
    drawCharaTable('cool');
    drawHeatDataTable();
    drawCharaTable('heat');
    //设置电网option
    districtOptionSet();
    // 根据电网设置可选择日期
    $('#district-select').change(function () {
        dateSet();
    })
    // 分析按钮被点击
    $("#analysis-button").click(function () {
            let year = $('#datepicker-year').val();
            let district_id = $('#district-select').val();
            if (year.length === 0) {
                alert('请选择年份');
            } else {
                // 设置画布点击后显示正在加载
                $('.myEcharts').each(function () {
                    let id = $(this).attr('id');
                    // $(this).empty();
                    let myChart = echarts.init(document.getElementById(id));
                    myChart.showLoading({
                        text: '正在加载数据···',
                        color: '#007d7b',
                        textColor: '#000',
                        maskColor: 'rgba(255, 255, 255, 0.2)',
                        zlevel: 0,
                    });
                });
                // 设置表格显示loading
                $('.myTables').each(function () {
                    $(this).bootstrapTable('showLoading');
                })
                $.ajax({
                    url: "/cool_heat_load/" + district_id,
                    type: 'GET',
                    data: {'time': year},
                    dateType: "json",
                    success: function (result) {
                        all_data = JSON.parse(result);
                        drawCoolLoadLine();
                        drawHeatLoadLine();
                        let cool_data = [];
                        let heat_data = [];
                        for (let i = 0; i < 24; i++) {
                            if (all_data.load_cool.length !== 0) {
                                cool_data.push({
                                    'time': i,
                                    'load_with_cool': all_data.load_with_cool[i].toFixed(2),
                                    'load_without_cool': all_data.load_without_cool[i].toFixed(2),
                                    'load_cool': all_data.load_cool[i].toFixed(2),
                                });
                            }
                            if (all_data.load_heat.length !== 0) {
                                heat_data.push({
                                    'time': i,
                                    'load_with_heat': all_data.load_with_heat[i].toFixed(2),
                                    'load_without_heat': all_data.load_without_heat[i].toFixed(2),
                                    'load_heat': all_data.load_heat[i].toFixed(2),
                                });
                            }
                        }
                        loadDataTable('cool', cool_data);
                        loadDataTable('heat', heat_data);
                        let load_with_cool_chara = {'type': '有降温负荷'};
                        let load_without_cool_chara = {'type': '无降温负荷'};
                        let load_cool_chara = {'type': '降温负荷'};
                        let load_with_heat_chara = {'type': '有采暖负荷'};
                        let load_without_heat_chara = {'type': '无采暖负荷'};
                        let load_heat_chara = {'type': '采暖负荷'};
                        for (let i = 0; i < all_data.load_with_cool_chara.length; i++) {
                            if (all_data.load_cool_chara.length !== 0) {
                                load_with_cool_chara[day_chara_names[i]] = all_data.load_with_cool_chara[i].toFixed(2);
                                load_without_cool_chara[day_chara_names[i]] = all_data.load_without_cool_chara[i].toFixed(2);
                                load_cool_chara[day_chara_names[i]] = all_data.load_cool_chara[i].toFixed(2);
                            }
                            if (all_data.load_heat_chara.length !== 0) {
                                load_with_heat_chara[day_chara_names[i]] = all_data.load_with_heat_chara[i].toFixed(2);
                                load_without_heat_chara[day_chara_names[i]] = all_data.load_without_heat_chara[i].toFixed(2);
                                load_heat_chara[day_chara_names[i]] = all_data.load_heat_chara[i].toFixed(2);
                            }
                        }
                        loadCharaTable('cool', [load_with_cool_chara, load_without_cool_chara, load_cool_chara]);
                        loadCharaTable('heat', [load_with_heat_chara, load_without_heat_chara, load_heat_chara]);
                    }
                })
            }
        }
    )
})


function districtOptionSet() {
    $.ajax({
        url: "/indexgetdata",
        type: 'GET',
        data: {'search_kw': 'load_'},
        dataType: "json",
        success: function (result) {
            let select = $("#district-select");
            select.empty();
            let option;
            for (let i = 0; i < result.length; i++) {
                option = $("<option></option>").text(result[i].district_name);
                option.attr('value', result[i].district_id);
                select.append(option);
            }
            dateSet(init = true);
        }
    });
}

function dateSet(init = false) {
    let district_id = $('#district-select').val();
    $.ajax({
        url: "/indexgetdata",
        type: 'GET',
        data: {'search_kw': 'load_', 'district_id': district_id},
        dataType: "json",
        success: function (result) {
            $('.J-yearPicker-single').datePicker({
                format: 'YYYY',
                language: 'zh',
                min: result[0].min_time,
                max: result[0].max_time,
            });
            $('#datepicker-year').val(result[0].max_time.slice(0, 4));
            if (init) {
                $('#analysis-button').click();
            }
        }
    })
}

function drawCoolLoadLine() {
    let myChart = echarts.init(document.getElementById('cool-load'));
    myChart.hideLoading();
    let option;
    option = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9'],
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ["有降温负荷", "无降温负荷", "降温负荷"],
            orient: 'horizontal',
            left: 'center',
            icon: 'circle',
            textStyle: {
                fontSize: 12,
            }
        },
        grid: {
            bottom: '10%',
            top: '20%',
            left: '5%',
            right: '5%',
            containLabel: true
        },
        toolbox: {
            feature: {}
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: time,
            name: '时间/h',
            nameLocation: 'middle',
            nameGap: 20,
            nameTextStyle: {
                fontSize: 10,
            },
            axisLabel: {
                // interval: 0,
                fontSize: 10,
            },
        },
        yAxis: {
            type: 'value',
            name: '负荷(MW)',
            nameGap: 10,
            nameTextStyle: {
                fontSize: 10,
            },
            axisLabel: {
                fontSize: 10,
            }
        },
        series: [
            {
                type: 'line',
                data: all_data['load_with_cool'].map(value => value.toFixed(2)),
                // areaStyle: {},
                name: '有降温负荷',
                animation: false,
            },
            {
                type: 'line',
                data: all_data['load_without_cool'].map(value => value.toFixed(2)),
                // areaStyle: {},
                name: '无降温负荷',
                animation: false,
            },
            {
                type: 'line',
                data: all_data['load_cool'].map(value => value.toFixed(2)),
                // areaStyle: {},
                name: '降温负荷',
                animation: false,
            },
        ],
    };
    myChart.setOption(option, true);
    // 提示信息
    let info;
    if (all_data['load_cool'].length === 0) {
        info = "<p>暂无当年降温负荷相关数据</p>";
    } else {
        let index_max = all_data['load_cool'].indexOf(ecStat.statistics.max(all_data['load_cool']));
        let index_min = all_data['load_cool'].indexOf(ecStat.statistics.min(all_data['load_cool']));
        let mean_day = ecStat.statistics.mean(all_data['load_cool'].slice(9, 17));
        let mean_night = ecStat.statistics.mean(all_data['load_cool'].slice(0, 6).concat(all_data['load_cool'].slice(20, 23)));
        let high_or_low;
        if (mean_day > mean_night) {
            high_or_low = "高";
        } else {
            high_or_low = "低";
        }
        info = "<p>根据有降温负荷代表日和无降温负荷代表日，获得降温负荷并分析<br/>"
            + "降温负荷最大值出现于：第" + index_max + "时<br/>"
            + "降温负荷最小值出现于：第" + index_min + "时<br/>"
            + "白日平均降温负荷为：" + mean_day.toFixed(2) + "MW<br/>"
            + "夜晚平均降温负荷为：" + mean_night.toFixed(2) + "MW<br/>"
            + "白日降温负荷较晚上更" + high_or_low + "<br/>"
            + "</p>";
    }
    $('#info-cool-load-data').attr('data-original-title', info).tooltip();
}

function drawHeatLoadLine() {
    let myChart = echarts.init(document.getElementById('heat-load'));
    myChart.hideLoading();
    let option;
    option = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9'],
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ["有采暖负荷", "无采暖负荷", "采暖负荷"],
            orient: 'horizontal',
            left: 'center',
            icon: 'circle',
            textStyle: {
                fontSize: 12,
            }
        },
        grid: {
            bottom: '10%',
            top: '20%',
            left: '5%',
            right: '5%',
            containLabel: true
        },
        toolbox: {
            feature: {}
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: time,
            name: '时间/h',
            nameLocation: 'middle',
            nameGap: 20,
            nameTextStyle: {
                fontSize: 10,
            },
            axisLabel: {
                // interval: 0,
                fontSize: 10,
            },
        },
        yAxis: {
            type: 'value',
            name: '负荷(MW)',
            nameGap: 10,
            nameTextStyle: {
                fontSize: 10,
            },
            axisLabel: {
                fontSize: 10,
            }
        },
        series: [
            {
                type: 'line',
                data: all_data['load_with_heat'].map(value => value.toFixed(2)),
                // areaStyle: {},
                name: '有采暖负荷',
                animation: false,
            },
            {
                type: 'line',
                data: all_data['load_without_heat'].map(value => value.toFixed(2)),
                // areaStyle: {},
                name: '无采暖负荷',
                animation: false,
            },
            {
                type: 'line',
                data: all_data['load_heat'].map(value => value.toFixed(2)),
                name: '采暖负荷',
                animation: false,
            },
        ],
    };
    myChart.setOption(option, true);
    // 提示信息
    let info;
    if (all_data['load_heat'].length === 0) {
        info = "<p>暂无当年采暖负荷相关数据</p>";
    } else {
        let index_max = all_data['load_heat'].indexOf(ecStat.statistics.max(all_data['load_heat']));
        let index_min = all_data['load_heat'].indexOf(ecStat.statistics.min(all_data['load_heat']));
        let mean_day = ecStat.statistics.mean(all_data['load_heat'].slice(9, 17));
        let mean_night = ecStat.statistics.mean(all_data['load_heat'].slice(0, 6).concat(all_data['load_heat'].slice(20, 23)));
        let high_or_low;
        if (mean_day > mean_night) {
            high_or_low = "高";
        } else {
            high_or_low = "低";
        }
        info = "<p>根据有采暖负荷代表日和无采暖负荷代表日，获得采暖负荷并分析<br/>"
            + "采暖负荷最大值出现于：第" + index_max + "时<br/>"
            + "采暖负荷最小值出现于：第" + index_min + "时<br/>"
            + "白日平均采暖负荷为：" + mean_day.toFixed(2) + "MW<br/>"
            + "夜晚平均采暖负荷为：" + mean_night.toFixed(2) + "MW<br/>"
            + "白日采暖负荷较晚上更" + high_or_low + "<br/>"
            + "</p>";
    }
    $('#info-heat-load-data').attr('data-original-title', info).tooltip();
}

function drawCoolDataTable() {
    let table = $('#cool-load-data');
    let height = $('#cool-load').height();
    let columns = [
        {
            field: 'time',
            title: '时间',
        },
        {
            field: 'load_with_cool',
            title: '有降温负荷',
        },
        {
            field: 'load_without_cool',
            title: '无降温负荷',
        },
        {
            field: 'load_cool',
            title: '降温负荷',
        },
    ];
    table.bootstrapTable({
        data: [],
        height: height,
        striped: true,
        cache: false,
        toolbar: false,
        toolbarAlign: 'right',
        pagination: false,
        pageNumber: 1,
        pageSize: 10,
        pageList: [10, 25, 50, 100],
        search: false,
        searchOnEnterKey: true,
        searchAlign: 'right',
        showColumns: false,
        showRefresh: false,
        showToggle: false,
        showPaginationSwitch: false,
        showLoading: false,
        showExport: false,                     //是否显示导出按钮
        exportTypes: ['csv', 'txt', 'sql', 'doc', 'excel', 'xlsx', 'pdf'],           //导出文件类型
        exportDataType: "all",             //basic当前页', 'all所有, 'selected'.
        exportOptions: {
            fileName: '降温负荷',  //文件名称设置
            worksheetName: 'sheet1',  //表格工作区名称
            tableName: '降温负荷',
        },
        headerStyle: function () {
            return {
                css: {
                    background: '#3BB5A0',
                    color: '#ffffff',
                }
            }
        },
        columns: columns,
    });
}

function drawHeatDataTable() {
    let table = $('#heat-load-data');
    let height = $('#cool-load').height();
    let columns = [
        {
            field: 'time',
            title: '时间',
        },
        {
            field: 'load_with_heat',
            title: '有采暖负荷',
        },
        {
            field: 'load_without_heat',
            title: '无采暖负荷',
        },
        {
            field: 'load_heat',
            title: '采暖负荷',
        },
    ];
    table.bootstrapTable({
        data: [],
        height: height,
        striped: true,
        cache: false,
        toolbar: false,
        toolbarAlign: 'right',
        pagination: false,
        pageNumber: 1,
        pageSize: 10,
        pageList: [10, 25, 50, 100],
        search: false,
        searchOnEnterKey: true,
        searchAlign: 'right',
        showColumns: false,
        showRefresh: false,
        showToggle: false,
        showPaginationSwitch: false,
        showLoading: false,
        showExport: false,                     //是否显示导出按钮
        exportTypes: ['csv', 'txt', 'sql', 'doc', 'excel', 'xlsx', 'pdf'],           //导出文件类型
        exportDataType: "all",             //basic当前页', 'all所有, 'selected'.
        exportOptions: {
            fileName: '采暖负荷',  //文件名称设置
            worksheetName: 'sheet1',  //表格工作区名称
            tableName: '采暖负荷',
        },
        headerStyle: function () {
            return {
                css: {
                    background: '#3BB5A0',
                    color: '#ffffff',
                }
            }
        },
        columns: columns,
    });
}

function drawCharaTable(type) {
    let table = $('#' + type + '-load-influence');
    let height = $('#cool-load').height();
    let columns = [{
        field: 'type',
        title: '类型',
    }]
    for (let i = 0; i < 7; i++) {
        columns.push({
            field: day_chara_names[i],
            title: day_chara_names[i],
        })
    }
    table.bootstrapTable({
        data: [],
        height: height,
        striped: true,
        cache: false,
        toolbar: '#toolbar',
        toolbarAlign: 'right',
        pagination: false,
        pageNumber: 1,
        pageSize: 10,
        pageList: [10, 25, 50, 100],
        search: false,
        searchOnEnterKey: true,
        searchAlign: 'right',
        showColumns: true,
        showRefresh: false,
        showToggle: false,
        showPaginationSwitch: false,
        showLoading: false,
        showExport: true,                     //是否显示导出按钮
        exportTypes: ['csv', 'txt', 'sql', 'doc', 'excel', 'xlsx', 'pdf'],           //导出文件类型
        exportDataType: "all",             //basic当前页', 'all所有, 'selected'.
        exportOptions: {
            fileName: '降温采暖负荷影响',  //文件名称设置
            worksheetName: 'sheet1',  //表格工作区名称
            tableName: '降温采暖负荷影响',
        },
        headerStyle: function () {
            return {
                css: {
                    background: '#3BB5A0',
                    color: '#ffffff',
                }
            }
        },
        columns: columns,
    });
}

function loadDataTable(type, data) {
    let table = $('#' + type + '-load-data');
    table.bootstrapTable('hideLoading');
    table.bootstrapTable('load', data);
}

function loadCharaTable(type, data) {
    let table = $('#' + type + '-load-influence');
    table.bootstrapTable('hideLoading');
    table.bootstrapTable('load', data);
    //提示信息
    let info_item = $('#info-' + type + '-load-influence');
    let info;
    if (type === 'cool') {
        if (all_data['load_cool'].length === 0) {
            info = "<p>暂无当年降温负荷相关数据</p>";
            info_item.attr('data-original-title', info).tooltip();
            return;
        } else {
            info = '<p>' + '各日负荷特性指标定义如下:<br/>';
            for (let i in day_chara_names){
                info = info + day_chara_names[i] + ': ' + day_chara_desc[i] + '<br/>';
            }
            info = info + '<br/>' + "获取有无降温负荷日负荷特性指标，分析降温负荷对日负荷特性的影响<br/>"
                + "可以发现，降温负荷使得：<br/>";
        }
    }
    if (type === 'heat') {
        if (all_data['load_heat'].length === 0) {
            info = "<p>暂无当年采暖负荷相关数据</p>";
            info_item.attr('data-original-title', info).tooltip();
            return;
        } else {
            info = '<p>' + '各日负荷特性指标定义如下:<br/>';
            for (let i in day_chara_names){
                info = info + day_chara_names[i] + ': ' + day_chara_desc[i] + '<br/>';
            }
            info = info + '<br/>' + "获取有无采暖负荷日负荷特性指标，分析采暖负荷对日负荷特性的影响<br/>"
                + "可以发现，采暖负荷使得：<br/>";
        }
    }

    for (let i = 3; i < 7; i++) {
        if (all_data['load_with_' + type + '_chara'][i] > all_data['load_without_' + type + '_chara'][i]) {
            info = info + day_chara_names[i] + "变高<br/>";
        } else {
            info = info + day_chara_names[i] + "变低<br/>";
        }
    }
    info = info + "</p>";
    info_item.attr('data-original-title', info).tooltip();
}