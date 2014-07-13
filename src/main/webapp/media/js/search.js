/**
Open PEP Search
Copyright (C) 2013, 2013, TESOBE / Music Pictures Ltd

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

Email: contact@tesobe.com
TESOBE / Music Pictures Ltd
Osloerstrasse 16/17
Berlin 13359, Germany

  This product includes software developed at
  TESOBE (http://www.tesobe.com/)
  by
  Simon Redfern : simon AT tesobe DOT com
  Nina Gänsdorfer: nina AT tesobe DOT com
  Ayoub Benali: ayoub AT tesobe DOT com

 */

$(document).ready(function(){
  enableSearchButtons()
  enableEnterClickToStartSearch()
  checkUrlAndStartQuery()
})


function checkUrlAndStartQuery(){
  if($(location).attr('search') && $(location).attr('search') != ""){
    if($(location).attr('pathname').indexOf("/details")!= -1){
      getIdDetailsFor(getURLParams("id"))
    }
    else if($(location).attr('search') && $(location).attr('search') != ""){
      setGlobalSearchVariablesAndPrepareSearch()
    }
  }
}

function enableSearchButtons(){
  // button in search bar
  $("#searchBtn").click(function() {
    attachSearchParamsToURL()
   })

  // buttons in advanced search box
  $("#advancedBtn").click(function() {
    $('#advancedSearchBox').slideDown('show')

    $("#birthday").datepicker();

    $("#closeBox").click(function() {
      $('#advancedSearchBox').slideUp('fast')
     })
   })
}

function enableEnterClickToStartSearch(){
  $(document).keypress(function(event){
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if(keycode == '13'){
      attachSearchParamsToURL();
    }
  })
}

// prepare search: load index with search params in url
function attachSearchParamsToURL(){
  var search = $('#search_word').val()
  var fields = getNameArray()
  var res = $('#residence').val()
  var cit = $('#citizenship').val()
  window.location.href = '/index.html?search='+search+'&fields='+fields+'&res='+res+'&cit='+cit;
}


function setGlobalSearchVariablesAndPrepareSearch(){
  search = getURLParams('search')
  limit = 5,
  fields = getURLParams('fields')
  res = getURLParams('res')
  cit = getURLParams('cit')
  $('#search_word').val(decodeURIComponent(search))
  sendSearchRequest()
}

function getURLParams(paramName){
  var url = window.location.search.substring(1)
  var urlParams = url.split('&')
  for (var i = 0; i < urlParams.length; i++){
    var paramNameArray = urlParams[i].split('=')
    if (paramNameArray[0] == paramName){
      return paramNameArray[1]
    }
  }
}

function sendSearchRequest(){
  var queryJson = ($('#search_word').val() == "") ? getAllRecordsJson() : createSearchJson()
  $.ajax({
    type: "GET",
    url: "/search?source="+queryJson,
    success: function(data){
      displayData(data.hits)
    },
    dataType: "json"
  });
}

function getAllRecordsJson(){
  var allRecordsJson ={
    "from":0,
    "size":2*limit,
    "query":{"match_all":{}},
    "sort":["LastName"]
  }
  return JSON.stringify(allRecordsJson)
}


function createSearchJson(){
  var searchJson ={
    "from":0,"size":limit,
    "query":{
      "bool":{
        "must":[
          {
          "multi_match":{
            "query":search,
            "fields":getNameArray(),
            "fuzziness":0.6
            }
          }
        ]
      }
    }
  }

  // Birthday parameter is currently ignored, because
  // there is no birthday available on Elastic Search
  // if ($('#birthday').val() != ""){
  //   var birthday = //birthday in right format
  //   var birthMatch = {"match":{"birthday":birthday}}
  //   searchJson.query.bool.must.push(birthMatch)
  // }

  if (res && res != ""){
    var resMatch = {"match":{"Residence":res}}
    searchJson.query.bool.must.push(resMatch)
  }

  if (cit && cit != ""){
    var citMatch = {"match":{"Citizenship":cit}}
    searchJson.query.bool.must.push(citMatch)
  }
  return JSON.stringify(searchJson)
}


// search in First name  / Last name / All names (default), depending on selected radio button in advanced search
function getNameArray(){
  var name_array = new Array()
  var name_field = $('input[name=field]:checked').val()
  if(name_field == "first")
   name_array.push("FirstName")
  else if (name_field == "last")
    name_array.push("LastName")
  else
    name_array.push("FirstName")
    name_array.push("MiddleName")
    name_array.push("LastName")
  return name_array
}


// if the search was successful, display data in #display
function displayData(data) {
  $('#display').addClass('displayResults')
  $('#display').html("")
  if (data.total > 0){
    $('#display').append("<table id='resultTable'><tr><th>First</th><th>Middle</th><th>Surname</th><th>Position</th><th>Nationality</th><th>Residence</th></tr></table>")
    $.each(data.hits, function(i, person) {
      $('#resultTable').append("<tr class='personRow' name="+i+" id='personRow"+i+"'></tr>")
      $('#personRow'+i).append("<td>"+person._source["FirstName"]+"</td>")
      $('#personRow'+i).append("<td>"+person._source["MiddleName"]+"</td>")
      $('#personRow'+i).append("<td>"+person._source["LastName"]+"</td>")
      $('#personRow'+i).append("<td>"+person._source["Position"]+"</td>")
      $('#personRow'+i).append("<td>"+person._source["Citizenship"]+"</td>")
      $('#personRow'+i).append("<td>"+person._source["Residence"]+"</td>")
    })
    if(data.total > limit){
      $('#display').append('<div id="moreResults"><img src="/media/images/arrow.png">More Results</div>')
    }
    enableGetDetailsClick(data.hits)
  }
  else{
    $('#display').append('<div id="noResult" class="not-found"></div>')
    $('#noResult').append( '<p>It looks like we haven’t found the name you gave us in our database. This does not necessarily mean that the individual you are looking for is not a PEP.</p>')
    $('#noResult').append( '<p>We encourage financial institutions to take a comprehensive risk based approach to due diligence. Registered users are invited to search other sources and add information to the database.</p>')
    $('#noResult').append( '<p><a href="#">Upload</a></p>')
  }

  if(data.total > limit){
    $("#moreResults").click(function() {
      limit = limit+5
      sendSearchRequest()
    })
  }
}

// enable click on row for getting details of that person
function enableGetDetailsClick(hits) {
  $(".personRow" ).click(function() {
    var id= hits[$(this).attr("name")]._source["Register"]
    window.location.href = '/details?id='+id;
  })
}


// TODO: right now we use the source field 'Register' to get the person, should be replaced by a unique id
function getIdDetailsFor(id){
  $.ajax({
    type: "GET",
    url: '/search?source={"query":{"bool":{"must":{"match":{"Register":"'+id+'"}}}}}',
    success: function(data){
      if(data.hits.total > 0){
        fillDetailPage(data.hits.hits[0])
      }
      else{
        noDetailsFor(id)
      }
    },
    dataType: "json"
    });
}


function fillDetailPage(person){
  $("#title_field").append(person._source['Title'])
  $("#first_name_field").append(person._source['FirstName'])
  $("#last_name_field").append(person._source['LastName'])
  $("#other_names_field").append(person._source['MiddleName'])
  // $("#original_spelling_field").append(person._source[''])
  $("#position_field").append(person._source['Position'])
  // $("#birthday_field").append(person._source[''])
  $("#citizenship_field").append(person._source['Citizenship'])
  $("#residence_field").append(person._source['Residence'])
  // $("#in_office_since_field").append(person._source[''])
  // $("#out_office_since_field").append(person._source[''])
  // $("#expected_until_field").append(person._source[''])
  $('#source_field').append('<a href="'+person._source['Website']+'">'+person._source['Website']+'</a>')
}

function noDetailsFor(id){
  $('.displayDetails').html("")
  $('.displayDetails').append('<p class="not-found">No details for id <b>'+id+'</b> found.</p>')
}






