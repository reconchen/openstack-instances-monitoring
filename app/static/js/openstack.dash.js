$(function () {

    var reloadGraph;

    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    });

    function fmtBytes(bytes) {
        if (bytes==0) { return "0 bytes"; }
        var s = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'];
        var e = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, e)).toFixed(2) + " " + s[e];
    }

    print_server_container = function(instance) {
        st = 'warn';
        if (instance.status == 'active') {
            st = 'ok';
        } else if (instance.status == 'shutoff') {
            st = 'err';
        }
        return '<div class="panel panel-instance" data-instance="' + instance.id + '">'
               + '<div class="panel-heading cd-collapsable cd-collapsed">'
                 + '<h3 class="panel-title">'
                 + '<i class="glyphicon glyphicon-off icon-' + st + '"></i> '
                   + instance.name
                   + '<small> ('
                     + instance.id
                   + ')</small>'
                 + '</h3>'
               + '</div>'
               + '<div class="panel-body hide">'
               + '</div>'
             + '</div>'
    }


    print_server_details = function(server) {
        ips = ''
        for (i=0; i < server.networks.length; i++) {
            ips += '<div class="row"><div class="col-md-12"><span class="strong">IP:</span> ' + server.networks[i].addr + ' (' + server.networks[i].type + ')</div></div>'
        }
        return '<div class="row">'
                + '<div class="col-md-3">'
                 + '<div class="row"><div class="col-md-12"><span class="strong">Environment:</span> ' + server.project + '</div></div>'
                 + '<div class="row"><div class="col-md-12"><span class="strong">Hypervisor Host:</span> ' + server.hypervisor + '</div></div>'
                 + '<div class="row"><div class="col-md-12"><span class="strong">Owner:</span> ' + server.user.name + ' (' + server.user.email + ')</div></div>'
                 + '<div class="row"><div class="col-md-12"><span class="strong">Tenant:</span> ' + server.tenant.name + '</div></div>'
                + '</div>'
                + '<div class="col-md-3">'
                 + ips
                + '</div>'
                + '<div class="col-md-3">'
                 + '<div class="row"><div class="col-md-12"><span class="strong">Flavor Name:</span> ' + server.flavor.name + '</div></div>'
                 + '<div class="row text-center"><div class="col-md-4"><span class="strong block">vCPUs:</span> ' + server.flavor.vcpus + '</div>'
                 + '<div class="col-md-4"><span class="strong block">RAM:</span> ' + fmtBytes(server.flavor.ram*1024*1024) + '</div>'
                 + '<div class="col-md-4"><span class="strong block">Disk:</span> ' + fmtBytes(server.flavor.disk*1024*1024*1024) + '</div></div>'
                + '</div>'
                + '<div class="col-md-3">'
                 + '<div class="row"><div class="col-md-12"><span class="strong">Image Name:</span> ' + server.image.name + '</div></div>'
                + '</div>'
               + '</div>'
               + '<div class="row">'
                + '<div class="col-md-6">'
                 + '<div class="cpu_usage"></div>'
                + '</div>'
                + '<div class="col-md-6">'
                 + '<div class="mem_usage"></div>'
                + '</div>'
               + '</div>'
    }

    print_current_report = function(n, d) {
        line = '<tr>'
               +  '<td>' + n + '</td>'
               +   '<td>' + d.vms + '</td>'
               +   '<td>' + d.cpu + '</td>'
               +   '<td>' + d.mem + '</td>'
               +   '<td>' + d.disk + '</td>'
               + '</tr>';
        return line;
    }

    load_servers = function() {
        $('.panel-instance-list').empty();
        $.ajax({
            url: '/servers',
            cache: false,
            statusCode: {
                200: function(data) {
                    for (i = 0; i < data.instances.length; i++) {
                        $('.panel-instance-list').append(
                            print_server_container(data.instances[i])
                        );
                        if (i == data.instances.length-1) {
                            turn_collapsable();
                        }
                    }
                }
            }
        });
    };

    load_current_report = function() {
        $('.table-report > tbody').empty();
        $.ajax({
            url: '/report/resources',
            cache: false,
            statusCode: {
                200: function(data) {
                    $.each(data, function(index, value) {
                        if ( index != '_total' && index != '_size') {
                            $('.table-report > tbody').append(
                                print_current_report(index, data[index])
                            ); 
                        }
                        if (data['_size'] == $('.table-report > tbody tr').length ) {
                            $('.table-report > tbody').append(
                                print_current_report('Total', data['_total'])
                            );
                        }
                    });
                }
            }
        });
    };

    search_servers = function(s) {
        $('.panel-instance-list').empty();
        $.ajax({
            url: '/search/' + s,
            cache: false,
            statusCode: {
                200: function(data) {
                    for (i = 0; i < data.instances.length; i++) {
                        $('.panel-instance-list').append(
                            print_server_container(data.instances[i])
                        );
                        if (i == data.instances.length-1) {
                            turn_collapsable();
                        }
                    }
                }
            }
        });
    };

    get_server = function(id) {
        $.ajax({
            url: '/server/' + id,
            cache: false,
            statusCode: {
                200: function(data) {
                    $('.panel-instance[data-instance="' + id + '"] .panel-body').html(
                        print_server_details(data)
                    );
                    load_graph('.cpu_usage', data.id, 'cpu');
                    load_graph('.mem_usage', data.id, 'mem');
                    reloadGraph = setInterval(function() {
                        load_graph('.cpu_usage', data.id, 'cpu');
                        load_graph('.mem_usage', data.id, 'mem');
                    }, 60000);
                }
            }
        });
    };

    turn_collapsable = function() {
        $('.cd-collapsable').on("click", function (e) {
            clearInterval(reloadGraph);
            $('.panel-heading.cd-collapsable').not('.cd-collapsed').parent('.panel').find('.panel-body').empty().slideUp();
            if ($(this).hasClass('cd-collapsed')) {
                // expand the panel
                $(this).parent('.panel').find('.panel-body.hide');
                $(this).parent('.panel').find('.panel-body').slideDown().removeClass('hide');
                $(this).removeClass('cd-collapsed');
                get_server($(this).parent('.panel').data('instance'));
            }
            else {
                // collapse the panel
                $(this).parent('.panel').find('.panel-body').slideUp();
                $(this).addClass('cd-collapsed');
            }
        });
    }


    load_graph = function(target, instance_id, chart_type) {
        var chart_type = typeof chart_type !== 'undefined' ? chart_type : 'cpu';
        var chart_title = '';
        var chart_label = '';
        if (chart_type == 'cpu') {
            chart_title = 'CPU usage';
            chart_label = 'CPU';
        } else if (chart_type == 'mem') {
            chart_title = 'Memory usage';
            chart_label = 'Memory';
        }
        $.getJSON('/monitoring/' + instance_id + '/' + chart_type, function (data) {

            $(target).highcharts({
                chart: {
                    zoomType: 'x',
                    height: '300'
                },
                title: {
                    text: chart_title,
                    align: 'left'
                },
                xAxis: {
                    type: 'datetime'
                },
                yAxis: {
                    title: {
                        text: '% of usage'
                    },
                    min: 0
                },
                legend: {
                    enabled: false
                },
                plotOptions: {
                    area: {
                        fillColor: {
                            linearGradient: {
                                x1: 0,
                                y1: 0,
                                x2: 0,
                                y2: 1
                            },
                            stops: [
                                [0, Highcharts.getOptions().colors[0]],
                                [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                            ]
                        },
                        marker: {
                            radius: 2
                        },
                        lineWidth: 1,
                        states: {
                            hover: {
                                lineWidth: 1
                            }
                        },
                        threshold: null
                    }
                },

                series: [{
                    type: 'area',
                    name: chart_label,
                    data: data.data
                }]
            });
        });
    }

    load_url = function(url, container) {
        $.ajax({
            url: url,
            cache: false,
            statusCode: {
                200: function(data) {
                    $(container).empty();
                    $(container).html(data);
                }
            }
        });
    };

    change_url = function(url) {
        fullUrl = '/dashboard'
        if (url) {
            fullUrl += url;
        }
        window.history.pushState('', '', fullUrl);
    }

    _load_all_instances = function() {
        url = '/instances';
        load_url(url, '.content');
        change_url(url);
    }

    _load_report = function() {
        url = '/report';
        load_url(url, '.content');
        change_url(url);
    }

    $('.link.instances').click(function() {
        _load_all_instances();
    });

    $('.link.report').click(function() {
        _load_report();
    });

});
