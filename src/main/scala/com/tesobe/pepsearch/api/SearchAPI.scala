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
 package com.tesobe.api

import net.liftweb.common.{Full,Box,Loggable}
import net.liftweb.http.js.JsExp
import net.liftweb.http.{JsonResponse,S}
import net.liftweb.http.rest._
import net.liftweb.json.Extraction
import net.liftweb.json.JsonAST.JValue
import net.liftweb.json.parse
import net.liftweb.json.Serialization.write
import net.liftweb.util.Helpers
import net.liftweb.util.Props
import org.json._
import dispatch._, Defaults._
import scala.concurrent.Await
import scala.concurrent.duration._


case class APIResponse(code: Int, body: JValue)

object SearchAPI extends RestHelper with Loggable {
  serve {
    case "search" :: Nil JsonGet json => {
      val query: Box[Map[String, List[String]]] = S.request.map(_.params)
      val queryString = query.map{
        m => {
          val queryParamsList = m.map{
            case (k, v) => k+"="+Helpers.urlEncode(v.mkString)
          }
          queryParamsList.mkString("&")
        }
      }
      val url_es = Props.get("url_es","http://localhost:9200")
      val request =
        url(url_es+"/people/_search?"+queryString.getOrElse(""))
        .GET
      val response = getAPIResponse(request)
    JsonResponse(response.body,("Access-Control-Allow-Origin","*") :: Nil, Nil, response.code)
    }
  }

  private def getAPIResponse(req : Req) : APIResponse = {
    Await.result(
      for(response <- Http(req > as.Response(p => p)))
      yield
      {
        val body = if(response.getResponseBody().isEmpty) "{}" else response.getResponseBody()
        APIResponse(response.getStatusCode, parse(body))
      }
    , Duration.Inf)
  }

}

